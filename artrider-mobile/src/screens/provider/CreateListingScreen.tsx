import { useEffect, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
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

type FormState = {
    category: string;
    title: string;
    brand: string;
    model: string;
    description: string;
    dailyPrice: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    coverUri: string | null;
    coverMime: string | null;
    photoChanged: boolean;
    quantity: number;
};

const EMPTY_STATE: FormState = {
    category: '',
    title: '',
    brand: '',
    model: '',
    description: '',
    dailyPrice: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Ecuador',
    latitude: null,
    longitude: null,
    coverUri: null,
    coverMime: null,
    photoChanged: false,
    quantity: 1,
};

export function CreateListingScreen() {
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
    const [form, setForm] = useState<FormState>(EMPTY_STATE);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [geocoding, setGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (!isEdit || !editListingId) return;
        getListingForEdit(editListingId).then((data) => {
            if (data) {
                setForm({
                    category: data.category,
                    title: data.title,
                    brand: data.brand,
                    model: data.model,
                    description: data.description,
                    dailyPrice: String(data.dailyPriceDollars),
                    addressLine1: data.addressLine1,
                    city: data.city,
                    state: data.state,
                    postalCode: data.postalCode,
                    country: data.country,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    coverUri: data.coverImageUrl,
                    coverMime: null,
                    photoChanged: false,
                    quantity: 1,
                });
            }
            setLoadingExisting(false);
        });
    }, [isEdit, editListingId]);

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
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

    const canContinue = (() => {
        switch (currentStepId) {
            case 'category': return !!form.category;
            case 'details': return form.title.trim().length >= 3;
            case 'photo': return !!form.coverUri;
            case 'price': return parseFloat(form.dailyPrice) > 0;
            case 'location': return !!(form.addressLine1.trim() && form.city.trim() && form.state.trim() && form.postalCode.trim() && form.latitude !== null && form.longitude !== null);
            case 'quantity': return form.quantity >= 1;
            default: return true;
        }
    })();

    function handleBack() {
        if (step === 0) {
            router.back();
            return;
        }
        setStep((s) => s - 1);
        setError(null);
    }

    async function handleContinue() {
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
                        <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                    )}
                </View>
                <View style={{ padding: Spacing.four }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text }}>
                        {form.title || 'Sin título'}
                    </ThemedText>
                    {(form.brand || form.model) && (
                        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                            {[form.brand, form.model].filter(Boolean).join(' · ')}
                        </ThemedText>
                    )}
                    <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
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

    if (loadingExisting) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.two }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three }}>
                        <Pressable onPress={handleBack} hitSlop={8}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </Pressable>
                        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
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
                        <Pressable onPress={() => setShowPreview(true)} hitSlop={8}>
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

                <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.six }} keyboardShouldPersistTaps="handled">
                    {currentStepId === 'category' && (
                        <View style={{ gap: Spacing.two }}>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.two }}>
                                ¿Qué tipo de equipo vas a publicar?
                            </ThemedText>
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
                        <View style={{ gap: Spacing.four }}>
                            <FormField label="Título del anuncio" required>
                                <TextInput
                                    value={form.title}
                                    onChangeText={(v) => update('title', v)}
                                    placeholder="Ej. Bocina JBL PartyBox 300"
                                    placeholderTextColor={colors.textSecondary}
                                    style={inputStyle(colors)}
                                />
                            </FormField>
                            <View style={{ flexDirection: 'row', gap: Spacing.three }}>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Marca">
                                        <TextInput
                                            value={form.brand}
                                            onChangeText={(v) => update('brand', v)}
                                            placeholder="JBL"
                                            placeholderTextColor={colors.textSecondary}
                                            style={inputStyle(colors)}
                                        />
                                    </FormField>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Modelo">
                                        <TextInput
                                            value={form.model}
                                            onChangeText={(v) => update('model', v)}
                                            placeholder="PartyBox 300"
                                            placeholderTextColor={colors.textSecondary}
                                            style={inputStyle(colors)}
                                        />
                                    </FormField>
                                </View>
                            </View>
                            <FormField label="Descripción">
                                <TextInput
                                    value={form.description}
                                    onChangeText={(v) => update('description', v)}
                                    placeholder="Cuenta a los clientes qué incluye, estado, accesorios..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={4}
                                    style={[inputStyle(colors), { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                                />
                            </FormField>
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.text }}>$</ThemedText>
                                <TextInput
                                    value={form.dailyPrice}
                                    onChangeText={(v) => update('dailyPrice', v.replace(/[^0-9.]/g, ''))}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="decimal-pad"
                                    style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.text, flex: 1 }}
                                />
                                <ThemedText style={{ fontSize: 15, color: colors.textSecondary }}>/día</ThemedText>
                            </View>
                        </View>
                    )}

                    {currentStepId === 'location' && (
                        <View style={{ gap: Spacing.four }}>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary }}>
                                ¿De dónde sale este equipo? Solo lo verán clientes con reserva confirmada.
                            </ThemedText>
                            <FormField label="Dirección" required>
                                <TextInput
                                    value={form.addressLine1}
                                    onChangeText={(v) => update('addressLine1', v)}
                                    placeholder="Calle y número"
                                    placeholderTextColor={colors.textSecondary}
                                    style={inputStyle(colors)}
                                />
                            </FormField>
                            <View style={{ flexDirection: 'row', gap: Spacing.three }}>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Ciudad" required>
                                        <TextInput
                                            value={form.city}
                                            onChangeText={(v) => update('city', v)}
                                            placeholder="Loja"
                                            placeholderTextColor={colors.textSecondary}
                                            style={inputStyle(colors)}
                                        />
                                    </FormField>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Provincia" required>
                                        <TextInput
                                            value={form.state}
                                            onChangeText={(v) => update('state', v)}
                                            placeholder="Loja"
                                            placeholderTextColor={colors.textSecondary}
                                            style={inputStyle(colors)}
                                        />
                                    </FormField>
                                </View>
                            </View>
                            <FormField label="Código postal" required>
                                <TextInput
                                    value={form.postalCode}
                                    onChangeText={(v) => update('postalCode', v)}
                                    placeholder="110150"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="number-pad"
                                    style={inputStyle(colors)}
                                />
                            </FormField>

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
                            {error && (
                                <View style={{ marginTop: Spacing.four, backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2', borderRadius: Radius.lg, padding: Spacing.three }}>
                                    <ThemedText style={{ color: colors.destructive, fontSize: 13.5 }}>{error}</ThemedText>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                <View style={{ padding: Spacing.four, borderTopWidth: 1, borderColor: colors.border }}>
                    <Pressable
                        onPress={handleContinue}
                        disabled={!canContinue || publishing}
                        style={{
                            backgroundColor: canContinue ? colors.primary : colors.backgroundSelected,
                            paddingVertical: Spacing.three,
                            borderRadius: Radius.lg,
                            alignItems: 'center',
                        }}
                    >
                        {publishing ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: canContinue ? '#fff' : colors.textSecondary }}>
                                {step === steps.length - 1 ? (isEdit ? 'Guardar cambios' : 'Publicar anuncio') : 'Continuar'}
                            </ThemedText>
                        )}
                    </Pressable>
                </View>

                <Modal visible={showPreview} animationType="slide" onRequestClose={() => setShowPreview(false)}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text }}>Vista previa</ThemedText>
                            <Pressable onPress={() => setShowPreview(false)} hitSlop={8}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: Spacing.four }}>
                            {renderPreviewCard()}
                            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.four }}>
                                Así se ve por ahora — sigue completando los pasos para publicar.
                            </ThemedText>
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    return (
        <View>
            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: Spacing.two }}>
                {label}{required && <ThemedText style={{ color: colors.destructive }}> *</ThemedText>}
            </ThemedText>
            {children}
        </View>
    );
}

function inputStyle(colors: any) {
    return {
        backgroundColor: colors.backgroundElement,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.three,
        paddingVertical: 13,
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: colors.text,
    };
}