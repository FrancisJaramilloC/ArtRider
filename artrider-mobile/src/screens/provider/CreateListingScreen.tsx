import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { ModalScreen } from '@/components/ui/ModalScreen';
import { ScreenSkeleton } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, MinTouch } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useLayout } from '@/hooks/use-layout';
import { maxLength, minLength, positivePrice, required } from '@/utils/validation';
import { toErrorInfo, type ErrorInfo } from '@/utils/errors';
import { CATEGORIES } from '@/constants/categories';
import { createListing, getListingForEdit, updateListing } from '@/services/providerCatalogService';

const DEFAULT_REGION = { latitude: -3.9931, longitude: -79.2042, latitudeDelta: 0.05, longitudeDelta: 0.05 }; // Loja, Ecuador

type StepId = 'category' | 'details' | 'photo' | 'price' | 'location' | 'quantity' | 'review';

const STEP_LABELS: Record<StepId, string> = {
    category: 'Categoría',
    details: 'Detalles',
    photo: 'Foto',
    price: 'Precio',
    location: 'Ubicación',
    quantity: 'Cantidad',
    review: 'Revisión',
};

/** Campos que no son de texto (se validan por paso con un aviso propio). */
type ExtraState = {
    category: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    coverUri: string | null;
    coverMime: string | null;
    photoChanged: boolean;
    quantity: number;
};

const EMPTY_EXTRA: ExtraState = {
    category: '',
    country: 'Ecuador',
    latitude: null,
    longitude: null,
    coverUri: null,
    coverMime: null,
    photoChanged: false,
    quantity: 1,
};

const EMPTY_TEXT = { title: '', brand: '', model: '', description: '', dailyPrice: '', addressLine1: '', city: '', state: '', postalCode: '' };

const TEXT_RULES = {
    title: [required('Ingresa un título para tu anuncio'), minLength(3, 'El título debe tener al menos 3 caracteres'), maxLength(100, 'El título admite hasta 100 caracteres')],
    brand: [maxLength(60, 'La marca admite hasta 60 caracteres')],
    model: [maxLength(60, 'El modelo admite hasta 60 caracteres')],
    description: [maxLength(2000, 'La descripción admite hasta 2000 caracteres')],
    dailyPrice: [required('Ingresa el precio por día'), positivePrice('Ingresa un precio mayor a 0')],
    addressLine1: [required('Ingresa la dirección')],
    city: [required('Ingresa la ciudad')],
    state: [required('Ingresa la provincia')],
    postalCode: [required('Ingresa el código postal')],
};

/** Campos de texto que se validan en cada paso del asistente. */
const STEP_FIELDS: Partial<Record<StepId, (keyof typeof EMPTY_TEXT)[]>> = {
    details: ['title', 'brand', 'model', 'description'],
    price: ['dailyPrice'],
    location: ['addressLine1', 'city', 'state', 'postalCode'],
};

export function CreateListingScreen() {
  const { gutter } = useLayout();
    const { id: editListingId } = useLocalSearchParams<{ id?: string }>();
    const isEdit = !!editListingId;
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const steps: StepId[] = isEdit
        ? ['category', 'details', 'photo', 'price', 'location', 'review']
        : ['category', 'details', 'photo', 'price', 'location', 'quantity', 'review'];

    const [loadingExisting, setLoadingExisting] = useState(isEdit);
    const [step, setStep] = useState(0);
    const text = useForm(EMPTY_TEXT, TEXT_RULES);
    const [extra, setExtra] = useState<ExtraState>(EMPTY_EXTRA);
    const form = { ...extra, ...text.values };
    const [stepError, setStepError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<ErrorInfo | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [geocoding, setGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (!isEdit || !editListingId) return;
        let cancelled = false;
        setLoadingExisting(true);
        setLoadError(null);
        getListingForEdit(editListingId)
            .then((data) => {
                if (cancelled || !data) return;
                text.reset({
                    title: data.title,
                    brand: data.brand,
                    model: data.model,
                    description: data.description,
                    dailyPrice: String(data.dailyPriceDollars),
                    addressLine1: data.addressLine1,
                    city: data.city,
                    state: data.state,
                    postalCode: data.postalCode,
                });
                setExtra({
                    category: data.category,
                    country: data.country,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    coverUri: data.coverImageUrl,
                    coverMime: null,
                    photoChanged: false,
                    quantity: 1,
                });
            })
            .catch((e) => {
                if (!cancelled) setLoadError(toErrorInfo(e));
            })
            .finally(() => {
                if (!cancelled) setLoadingExisting(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, editListingId, reloadKey]);

    function update<K extends keyof ExtraState>(key: K, value: ExtraState[K]) {
        setExtra((prev) => ({ ...prev, [key]: value }));
        setStepError(null);
    }

    async function pickImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets[0]) {
            update('coverUri', result.assets[0].uri);
            update('coverMime', result.assets[0].mimeType ?? 'image/jpeg');
            update('photoChanged', true);
        }
    }

    async function geocodeAddress() {
        setGeocodeError(null);
        const fullAddress = `${form.addressLine1}, ${form.city}, ${form.state}, ${form.country}`;
        if (!form.addressLine1.trim() || !form.city.trim()) {
            setGeocodeError('Escribe al menos la dirección y la ciudad primero.');
            return;
        }

        setGeocoding(true);
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (!permission.granted) {
                setGeocodeError('Necesitamos permiso de ubicación para ubicar tu dirección en el mapa.');
                return;
            }

            const results = await Location.geocodeAsync(fullAddress);
            if (results.length === 0) {
                setGeocodeError('No pudimos encontrar esa dirección — puedes tocar el mapa para marcarla manualmente.');
                return;
            }

            update('latitude', results[0].latitude);
            update('longitude', results[0].longitude);
        } catch (e) {
            setGeocodeError('Error buscando la dirección — puedes tocar el mapa para marcarla manualmente.');
        } finally {
            setGeocoding(false);
        }
    }

    const currentStepId = steps[step];

    /** Valida el paso actual: muestra el error junto al campo (o un aviso) y devuelve si se puede avanzar. */
    function validateStep(): boolean {
        setStepError(null);
        const fields = STEP_FIELDS[currentStepId];
        if (fields && !text.validateAll(fields)) return false;
        if (currentStepId === 'category' && !form.category) {
            setStepError('Elige una categoría para continuar.');
            return false;
        }
        if (currentStepId === 'photo' && !form.coverUri) {
            setStepError('Elige una foto para continuar.');
            return false;
        }
        if (currentStepId === 'location' && (form.latitude === null || form.longitude === null)) {
            setStepError('Marca la ubicación en el mapa: toca «Buscar dirección» o toca el mapa.');
            return false;
        }
        return true;
    }

    function handleBack() {
        if (step === 0) {
            router.back();
            return;
        }
        setStep((s) => s - 1);
        setError(null);
        setStepError(null);
    }

    async function handleContinue() {
        if (publishing) return; // sin doble toque
        if (!validateStep()) return;
        if (step < steps.length - 1) {
            setStep((s) => s + 1);
            return;
        }

        setError(null);
        setPublishing(true);

        if (isEdit && editListingId) {
            const result = await updateListing({
                listingId: editListingId,
                category: form.category,
                title: form.title,
                brand: form.brand,
                model: form.model,
                description: form.description,
                dailyPriceDollars: parseFloat(form.dailyPrice),
                addressLine1: form.addressLine1,
                city: form.city,
                state: form.state,
                postalCode: form.postalCode,
                country: form.country,
                latitude: form.latitude!,
                longitude: form.longitude!,
                newCoverImageUri: form.photoChanged ? form.coverUri : null,
                newCoverImageMimeType: form.photoChanged ? form.coverMime : null,
            });
            setPublishing(false);
            if (result.error) {
                setError(result.error);
                return;
            }
        } else {
            const result = await createListing({
                category: form.category,
                title: form.title,
                brand: form.brand,
                model: form.model,
                description: form.description,
                dailyPriceDollars: parseFloat(form.dailyPrice),
                addressLine1: form.addressLine1,
                city: form.city,
                state: form.state,
                postalCode: form.postalCode,
                country: form.country,
                latitude: form.latitude!,
                longitude: form.longitude!,
                coverImageUri: form.coverUri!,
                coverImageMimeType: form.coverMime!,
                quantity: form.quantity,
            });
            setPublishing(false);
            if (result.error) {
                setError(result.error);
                return;
            }
        }

        router.replace('/(provider)/listings' as any);
    }

    const categoryOptions = CATEGORIES.filter((c) => c.id !== 'all');
    const mapRegion = form.latitude && form.longitude
        ? { latitude: form.latitude, longitude: form.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
        : DEFAULT_REGION;

    function renderPreviewCard() {
        return (
            <View style={{ borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.backgroundElement }}>
                <View style={{ width: '100%', aspectRatio: 4 / 3 }}>
                    {form.coverUri ? (
                        <Image source={{ uri: form.coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <View style={[{ width: '100%', height: '100%' }, { backgroundColor: colors.backgroundSelected }]} />
                    )}
                </View>
                <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text }}>
                        {form.title || 'Sin título'}
                    </ThemedText>
                    {(form.brand || form.model) && (
                        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: Spacing.half }}>
                            {[form.brand, form.model].filter(Boolean).join(' · ')}
                        </ThemedText>
                    )}
                    <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: Spacing.one }}>
                        {form.city || 'Ciudad'}{form.state ? `, ${form.state}` : ''}
                    </ThemedText>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginTop: Spacing.two }}>
                        ${form.dailyPrice || '0'} <ThemedText style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary }}>/día</ThemedText>
                    </ThemedText>
                    {!isEdit && (
                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: Spacing.two }}>
                            {form.quantity} {form.quantity === 1 ? 'unidad disponible' : 'unidades disponibles'}
                        </ThemedText>
                    )}
                </View>
            </View>
        );
    }

    if (loadError) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
                <ErrorState error={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
            </SafeAreaView>
        );
    }

    if (loadingExisting) {
        return (
            <ScreenSkeleton />
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ paddingHorizontal: gutter, paddingTop: Spacing.two }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three }}>
                        <Pressable onPress={handleBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver" style={{ minWidth: MinTouch, minHeight: MinTouch, justifyContent: 'center' }}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </Pressable>
                        <View style={{ flex: 1, flexDirection: 'row', gap: Spacing.one }}>
                            {steps.map((_, i) => (
                                <View
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: 3,
                                        borderRadius: 2,
                                        backgroundColor: i <= step ? colors.primary : colors.backgroundElement,
                                    }}
                                />
                            ))}
                        </View>
                        <Pressable onPress={() => setShowPreview(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Vista previa" style={{ minWidth: MinTouch, minHeight: MinTouch, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Ionicons name="eye-outline" size={22} color={colors.text} />
                        </Pressable>
                    </View>
                    <ThemedText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, marginBottom: Spacing.one }}>
                        Paso {step + 1} de {steps.length}
                    </ThemedText>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginBottom: Spacing.four }}>
                        {STEP_LABELS[currentStepId]}
                    </ThemedText>
                </View>

                <ScrollView ref={text.scrollRef} contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: Spacing.six }} keyboardShouldPersistTaps="handled">
                    {currentStepId === 'category' && (
                        <View style={{ gap: Spacing.two }}>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.two }}>
                                ¿Qué tipo de equipo vas a publicar?
                            </ThemedText>
                            {stepError ? <StepError message={stepError} /> : null}
                            {categoryOptions.map(({ id, label, icon }) => {
                                const isActive = form.category === id;
                                return (
                                    <Pressable
                                        key={id}
                                        onPress={() => update('category', id)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: Spacing.three,
                                            padding: Spacing.three,
                                            borderRadius: Radius.lg,
                                            borderWidth: isActive ? 2 : 1,
                                            borderColor: isActive ? colors.primary : colors.border,
                                            backgroundColor: isActive ? `${colors.primary}10` : 'transparent',
                                        }}
                                    >
                                        <Ionicons name={icon as any} size={22} color={isActive ? colors.primary : colors.textSecondary} />
                                        <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.text }}>
                                            {label}
                                        </ThemedText>
                                        {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}

                    {currentStepId === 'details' && (
                        <View style={{ gap: Spacing.three }}>
                            <FormField label="Título del anuncio" placeholder="Ej. Bocina JBL PartyBox 300" maxLength={100} returnKeyType="next" {...text.field('title')} />
                            <View style={{ flexDirection: 'row', gap: Spacing.three }}>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Marca" placeholder="JBL" maxLength={60} {...text.field('brand')} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Modelo" placeholder="PartyBox 300" maxLength={60} {...text.field('model')} />
                                </View>
                            </View>
                            <FormField label="Descripción" placeholder="Cuenta a los clientes qué incluye, estado, accesorios..." multiline maxLength={2000} {...text.field('description')} />
                        </View>
                    )}

                    {currentStepId === 'photo' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.three }}>
                                {isEdit ? 'Toca la foto para cambiarla.' : 'Una buena foto es lo primero que ven los clientes.'}
                            </ThemedText>
                            <Pressable
                                onPress={pickImage}
                                style={{
                                    width: '100%',
                                    aspectRatio: 4 / 3,
                                    borderRadius: Radius.lg,
                                    overflow: 'hidden',
                                    borderWidth: form.coverUri ? 0 : 2,
                                    borderColor: colors.border,
                                    borderStyle: 'dashed',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.backgroundElement,
                                }}
                            >
                                {form.coverUri ? (
                                    <Image source={{ uri: form.coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                ) : (
                                    <>
                                        <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                                        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: Spacing.two }}>
                                            Toca para elegir una foto
                                        </ThemedText>
                                    </>
                                )}
                            </Pressable>
                            {stepError ? <View style={{ marginTop: Spacing.three }}><StepError message={stepError} /></View> : null}
                            {form.coverUri && (
                                <Pressable onPress={pickImage} style={{ marginTop: Spacing.three, alignSelf: 'center' }}>
                                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary }}>
                                        Cambiar foto
                                    </ThemedText>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {currentStepId === 'price' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.four }}>
                                ¿Cuánto cobras por día de renta?
                            </ThemedText>
                            <FormField
                                label="Precio por día (USD)"
                                leftIcon="cash-outline"
                                placeholder="0"
                                keyboardType="decimal-pad"
                                hint="Es lo que cobras por cada día de renta."
                                maxLength={9}
                                {...text.field('dailyPrice')}
                                onChangeText={(v) => text.setValue('dailyPrice', v.replace(/[^0-9.]/g, ''))}
                            />
                        </View>
                    )}

                    {currentStepId === 'location' && (
                        <View style={{ gap: Spacing.four }}>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary }}>
                                ¿De dónde sale este equipo? Solo lo verán clientes con reserva confirmada.
                            </ThemedText>
                            <FormField label="Dirección" placeholder="Calle y número" autoComplete="street-address" {...text.field('addressLine1')} />
                            <View style={{ flexDirection: 'row', gap: Spacing.three }}>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Ciudad" placeholder="Loja" {...text.field('city')} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Provincia" placeholder="Loja" {...text.field('state')} />
                                </View>
                            </View>
                            <FormField label="Código postal" placeholder="110150" keyboardType="number-pad" autoComplete="postal-code" {...text.field('postalCode')} />

                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two }}>
                                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text }}>
                                        Confirma la ubicación en el mapa <ThemedText style={{ color: colors.destructive }}>*</ThemedText>
                                    </ThemedText>
                                    <Pressable onPress={geocodeAddress} disabled={geocoding}>
                                        {geocoding ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        ) : (
                                            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.primary }}>
                                                Buscar dirección
                                            </ThemedText>
                                        )}
                                    </Pressable>
                                </View>
                                {geocodeError && (
                                    <ThemedText style={{ fontSize: 12, color: colors.destructive, marginBottom: Spacing.two }}>
                                        {geocodeError}
                                    </ThemedText>
                                )}
                                <View style={{ height: 220, borderRadius: Radius.lg, overflow: 'hidden' }}>
                                    <MapView
                                        style={{ flex: 1 }}
                                        region={mapRegion}
                                        onPress={(e) => {
                                            update('latitude', e.nativeEvent.coordinate.latitude);
                                            update('longitude', e.nativeEvent.coordinate.longitude);
                                        }}
                                    >
                                        {form.latitude !== null && form.longitude !== null && (
                                            <Marker
                                                coordinate={{ latitude: form.latitude, longitude: form.longitude }}
                                                draggable
                                                onDragEnd={(e) => {
                                                    update('latitude', e.nativeEvent.coordinate.latitude);
                                                    update('longitude', e.nativeEvent.coordinate.longitude);
                                                }}
                                            />
                                        )}
                                    </MapView>
                                </View>
                                {stepError ? <View style={{ marginTop: Spacing.two }}><StepError message={stepError} /></View> : null}
                                <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: Spacing.two }}>
                                    {form.latitude !== null
                                        ? 'Puedes arrastrar el pin o tocar el mapa para ajustarlo.'
                                        : 'Toca "Buscar dirección" o toca directamente el mapa para marcar la ubicación.'}
                                </ThemedText>
                            </View>
                        </View>
                    )}

                    {currentStepId === 'quantity' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.four }}>
                                ¿Cuántas unidades de este equipo tienes disponibles para rentar?
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.five }}>
                                <Pressable
                                    onPress={() => update('quantity', Math.max(1, form.quantity - 1))}
                                    style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Ionicons name="remove" size={20} color={colors.text} />
                                </Pressable>
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 36, color: colors.text, minWidth: 60, textAlign: 'center' }}>
                                    {form.quantity}
                                </ThemedText>
                                <Pressable
                                    onPress={() => update('quantity', Math.min(50, form.quantity + 1))}
                                    style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Ionicons name="add" size={20} color={colors.text} />
                                </Pressable>
                            </View>
                            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.four }}>
                                No hace falta que anotes números de serie — nosotros los generamos automáticamente para tu inventario interno.
                            </ThemedText>
                        </View>
                    )}

                    {currentStepId === 'review' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.four }}>
                                {isEdit ? 'Así van a ver el anuncio actualizado:' : 'Así lo van a ver tus clientes:'}
                            </ThemedText>
                            {renderPreviewCard()}
                            {error ? (
                                <View style={{ marginTop: Spacing.four }}>
                                    <FormErrorBanner message={error} onRetry={handleContinue} retrying={publishing} />
                                </View>
                            ) : null}
                        </View>
                    )}
                </ScrollView>

                <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four, borderTopWidth: 1, borderColor: colors.border }}>
                    <Button
                        label={step === steps.length - 1 ? (isEdit ? 'Guardar cambios' : 'Publicar anuncio') : 'Continuar'}
                        onPress={handleContinue}
                        loading={publishing}
                    />
                </View>

                <ModalScreen visible={showPreview} title="Vista previa" onClose={() => setShowPreview(false)}>
                    <ScrollView contentContainerStyle={{ padding: Spacing.three }}>
                        {renderPreviewCard()}
                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.four }}>
                            Así se ve por ahora — sigue completando los pasos para publicar.
                        </ThemedText>
                    </ScrollView>
                </ModalScreen>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/** Aviso de error de un paso que no es un campo de texto (categoría, foto, ubicación). */
function StepError({ message }: { message: string }) {
    const colors = useTheme();
    return (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }}>
            <Ionicons name="alert-circle" size={16} color={colors.destructive} style={{ marginTop: Spacing.half }} />
            <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }}>
                {message}
            </Text>
        </View>
    );
}
