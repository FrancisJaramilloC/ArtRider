import { COPY } from '@/constants/copy';
import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { ModalScreen } from '@/components/ui/ModalScreen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenSkeleton } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radius, MinTouch } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useForm } from '@/hooks/useForm';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { toErrorInfo, type ErrorInfo } from '@/utils/errors';
import { integerAtLeast, maxLength, minLength, positivePrice, required } from '@/utils/validation';
import {
    getMyListings,
    createPackage,
    getPackageForEdit,
    updatePackage,
} from '@/services/providerCatalogService';

type StepId = 'items' | 'details' | 'capacity' | 'photo' | 'price' | 'review';
const STEPS: StepId[] = ['items', 'details', 'capacity', 'photo', 'price', 'review'];
const STEP_LABELS: Record<StepId, string> = {
    items: 'Equipos',
    details: 'Detalles',
    capacity: 'Capacidad',
    photo: 'Foto',
    price: 'Precio',
    review: 'Revisión',
};

const EMPTY_TEXT = { title: '', description: '', capacity: '', dailyPrice: '' };

const TEXT_RULES = {
    title: [required('Ingresa un título para el paquete'), minLength(3, 'El título debe tener al menos 3 caracteres'), maxLength(100, 'El título admite hasta 100 caracteres')],
    description: [maxLength(2000, 'La descripción admite hasta 2000 caracteres')],
    capacity: [required('Ingresa para cuántas personas alcanza'), integerAtLeast(1, 'Ingresa un número de personas mayor a 0')],
    dailyPrice: [required('Ingresa el precio por día'), positivePrice('Ingresa un precio mayor a 0')],
};

/** Campos de texto que se validan en cada paso. */
const STEP_FIELDS: Partial<Record<StepId, (keyof typeof EMPTY_TEXT)[]>> = {
    details: ['title', 'description'],
    capacity: ['capacity'],
    price: ['dailyPrice'],
};

/** Aviso de error de un paso que no es un campo de texto (equipos, foto). */
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

export function CreatePackageScreen() {
  const { gutter } = useLayout();
    const { id: editPackageId } = useLocalSearchParams<{ id?: string }>();
    const isEdit = !!editPackageId;
    const router = useRouter();
    const colors = useTheme();

    const [loadingExisting, setLoadingExisting] = useState(isEdit);
    const [step, setStep] = useState(0);
    const listingsLoad = useAsyncData(async () => (await getMyListings()).filter((l) => l.is_published));
    const myListings = listingsLoad.data ?? [];
    const loadingListings = listingsLoad.status === 'loading';
    const [selected, setSelected] = useState<Record<string, number>>({});
    const text = useForm(EMPTY_TEXT, TEXT_RULES);
    const { title, description, capacity, dailyPrice } = text.values;
    const [stepError, setStepError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<ErrorInfo | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [coverUri, setCoverUri] = useState<string | null>(null);
    const [coverMime, setCoverMime] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (!isEdit || !editPackageId) return;
        let cancelled = false;
        setLoadingExisting(true);
        setLoadError(null);
        getPackageForEdit(editPackageId)
            .then((data) => {
                if (cancelled || !data) return;
                text.reset({
                    title: data.title,
                    description: data.description,
                    capacity: String(data.capacityPeople),
                    dailyPrice: String(data.dailyPriceDollars),
                });
                setCoverUri(data.coverImageUrl);
                const preselected: Record<string, number> = {};
                data.items.forEach((item) => { preselected[item.listingId] = item.quantity; });
                setSelected(preselected);
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
    }, [isEdit, editPackageId, reloadKey]);

    function toggleItem(listingId: string) {
        setStepError(null);
        setSelected((prev) => {
            const next = { ...prev };
            if (next[listingId]) {
                delete next[listingId];
            } else {
                next[listingId] = 1;
            }
            return next;
        });
    }

    function setItemQuantity(listingId: string, qty: number) {
        setSelected((prev) => ({ ...prev, [listingId]: Math.max(1, qty) }));
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
            setCoverUri(result.assets[0].uri);
            setCoverMime(result.assets[0].mimeType ?? 'image/jpeg');
            setStepError(null);
        }
    }

    const currentStepId = STEPS[step];
    const selectedCount = Object.keys(selected).length;

    /** Valida el paso actual: error junto al campo (o un aviso) y devuelve si se puede avanzar. */
    function validateStep(): boolean {
        setStepError(null);
        const fields = STEP_FIELDS[currentStepId];
        if (fields && !text.validateAll(fields)) return false;
        if (currentStepId === 'items' && selectedCount === 0) {
            setStepError('Elige al menos un equipo para armar el paquete.');
            return false;
        }
        if (currentStepId === 'photo' && !coverUri) {
            setStepError('Elige una foto para continuar.');
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
        if (step < STEPS.length - 1) {
            setStep((s) => s + 1);
            return;
        }

        setError(null);
        setPublishing(true);
        const items = Object.entries(selected).map(([listingId, quantity]) => ({ listingId, quantity }));

        if (isEdit && editPackageId) {
            const result = await updatePackage({
                packageId: editPackageId,
                title,
                description,
                capacityPeople: parseInt(capacity, 10),
                dailyPriceDollars: parseFloat(dailyPrice),
                newCoverImageUri: coverUri && !coverUri.startsWith('http') ? coverUri : null,
                newCoverImageMimeType: coverMime,
                items,
            });
            setPublishing(false);
            if (result.error) {
                setError(result.error);
                return;
            }
        } else {
            const result = await createPackage({
                title,
                description,
                capacityPeople: parseInt(capacity, 10),
                dailyPriceDollars: parseFloat(dailyPrice),
                coverImageUri: coverUri!,
                coverImageMimeType: coverMime!,
                items,
            });
            setPublishing(false);
            if (result.error) {
                setError(result.error);
                return;
            }
        }

        router.replace('/(provider)/listings' as any);
    }

    function renderPreviewCard() {
        return (
            <View style={{ borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.backgroundElement }}>
                <View style={{ width: '100%', aspectRatio: 4 / 3 }}>
                    {coverUri ? (
                        <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <View style={[{ width: '100%', height: '100%' }, { backgroundColor: colors.backgroundSelected }]} />
                    )}
                </View>
                <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text }}>
                        {title || 'Sin título'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: Spacing.one }}>
                        Hasta {capacity || '0'} personas
                    </ThemedText>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginTop: Spacing.two }}>
                        ${dailyPrice || '0'} <ThemedText style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary }}>/día</ThemedText>
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: Spacing.two }}>
                        {selectedCount} {selectedCount === 1 ? 'equipo incluido' : 'equipos incluidos'}
                    </ThemedText>
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
                            {STEPS.map((_, i) => (
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
                        Paso {step + 1} de {STEPS.length}
                    </ThemedText>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginBottom: Spacing.four }}>
                        {STEP_LABELS[currentStepId]}
                    </ThemedText>
                </View>

                <ScrollView ref={text.scrollRef} contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: Spacing.six }} keyboardShouldPersistTaps="handled">
                    {currentStepId === 'items' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.three }}>
                                Elige los equipos que van a formar este paquete, y cuántas unidades de cada uno.
                            </ThemedText>
                            {stepError ? <View style={{ marginBottom: Spacing.three }}><StepError message={stepError} /></View> : null}
                            {listingsLoad.status === 'error' ? (
                                <ErrorState error={listingsLoad.error} onRetry={listingsLoad.reload} />
                            ) : loadingListings ? (
                                <View style={{ gap: Spacing.two }}>
                                    {[0, 1, 2].map((i) => (
                                        <Skeleton key={i} height={72} radius={Radius.lg} />
                                    ))}
                                </View>
                            ) : myListings.length === 0 ? (
                                <EmptyState icon="cube-outline" title="Primero publica un equipo" description="Todavía no tienes equipos publicados — primero publica al menos un equipo individual para poder armar un paquete con ellos." />
                            ) : (
                                <View style={{ gap: Spacing.two }}>
                                    {myListings.map((listing) => {
                                        const isSelected = !!selected[listing.id];
                                        return (
                                            <View
                                                key={listing.id}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: Spacing.three,
                                                    padding: Spacing.three,
                                                    borderRadius: Radius.lg,
                                                    borderWidth: isSelected ? 2 : 1,
                                                    borderColor: isSelected ? colors.primary : colors.border,
                                                    backgroundColor: isSelected ? `${colors.primary}10` : 'transparent',
                                                }}
                                            >
                                                <Pressable onPress={() => toggleItem(listing.id)} style={{ width: 44, height: 44, borderRadius: Radius.md, overflow: 'hidden' }}>
                                                    {listing.cover_image_url ? (
                                                        <Image source={{ uri: listing.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                                    ) : (
                                                        <View style={[{ width: '100%', height: '100%' }, { backgroundColor: colors.backgroundSelected }]} />
                                                    )}
                                                </Pressable>
                                                <Pressable onPress={() => toggleItem(listing.id)} style={{ flex: 1 }}>
                                                    <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text }}>
                                                        {listing.title ?? 'Equipo'}
                                                    </ThemedText>
                                                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                                                        ${(listing.daily_price / 100).toFixed(0)}/día
                                                    </ThemedText>
                                                </Pressable>
                                                {isSelected ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                                                        <Pressable
                                                            onPress={() => setItemQuantity(listing.id, selected[listing.id] - 1)}
                                                            style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Ionicons name="remove" size={14} color={colors.text} />
                                                        </Pressable>
                                                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text, minWidth: 18, textAlign: 'center' }}>
                                                            {selected[listing.id]}
                                                        </ThemedText>
                                                        <Pressable
                                                            onPress={() => setItemQuantity(listing.id, selected[listing.id] + 1)}
                                                            style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Ionicons name="add" size={14} color={colors.text} />
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <Ionicons name="ellipse-outline" size={22} color={colors.textSecondary} />
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}

                    {currentStepId === 'details' && (
                        <View style={{ gap: Spacing.three }}>
                            <FormField label="Título del paquete" placeholder="Ej. Paquete Fiesta Completa" maxLength={100} {...text.field('title')} />
                            <FormField label="Descripción" placeholder="Cuenta para qué tipo de evento es ideal este paquete..." multiline maxLength={2000} {...text.field('description')} />
                        </View>
                    )}

                    {currentStepId === 'capacity' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.four }}>
                                ¿Para cuántas personas alcanza este paquete?
                            </ThemedText>
                            <FormField
                                label="Capacidad (personas)"
                                leftIcon="people-outline"
                                placeholder="0"
                                keyboardType="number-pad"
                                maxLength={5}
                                {...text.field('capacity')}
                                onChangeText={(v) => text.setValue('capacity', v.replace(/[^0-9]/g, ''))}
                            />
                        </View>
                    )}

                    {currentStepId === 'photo' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.three }}>
                                {isEdit ? 'Toca la foto para cambiarla.' : 'Una foto que represente bien el paquete completo.'}
                            </ThemedText>
                            <Pressable
                                onPress={pickImage}
                                style={{
                                    width: '100%',
                                    aspectRatio: 4 / 3,
                                    borderRadius: Radius.lg,
                                    overflow: 'hidden',
                                    borderWidth: coverUri ? 0 : 2,
                                    borderColor: colors.border,
                                    borderStyle: 'dashed',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.backgroundElement,
                                }}
                            >
                                {coverUri ? (
                                    <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
                            {coverUri && (
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
                                ¿Cuánto cobras por día por el paquete completo?
                            </ThemedText>
                            <FormField
                                label="Precio por día (USD)"
                                leftIcon="cash-outline"
                                placeholder="0"
                                keyboardType="decimal-pad"
                                hint="Es lo que cobras por cada día de renta del paquete completo."
                                maxLength={9}
                                {...text.field('dailyPrice')}
                                onChangeText={(v) => text.setValue('dailyPrice', v.replace(/[^0-9.]/g, ''))}
                            />
                        </View>
                    )}

                    {currentStepId === 'review' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.four }}>
                                {isEdit ? COPY.previewPackageUpdated : COPY.previewListingNew}
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
                        label={step === STEPS.length - 1 ? (isEdit ? 'Guardar cambios' : 'Publicar paquete') : 'Continuar'}
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
