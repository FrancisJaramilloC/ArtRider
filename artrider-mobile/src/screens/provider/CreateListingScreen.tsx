import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigPriceInput, FieldError, PhotoStep, ReviewSections, WizardPreviewCard, pickCoverImage, priceFromInput, useTwoColumnWidth, type ReviewItem } from '@/components/provider/WizardParts';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { WizardScaffold } from '@/components/ui/WizardScaffold';
import { CATEGORIES, CATEGORY_LABELS } from '@/constants/categories';
import { COPY } from '@/constants/copy';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useTheme } from '@/hooks/use-theme';
import { createListing, getListingForEdit, updateListing } from '@/services/providerCatalogService';
import { toErrorInfo, type ErrorInfo } from '@/utils/errors';
import { maxLength, minLength, positivePrice, required } from '@/utils/validation';

const DEFAULT_REGION = { latitude: -3.9931, longitude: -79.2042, latitudeDelta: 0.05, longitudeDelta: 0.05 }; // Loja, Ecuador
const MAP_HEIGHT = 260;
const CATEGORY_TILE_HEIGHT = 112;
const MAX_QUANTITY = 50;
const DESCRIPTION_MAX = 2000;

type StepId = 'category' | 'details' | 'photo' | 'price' | 'location' | 'quantity' | 'review';

const STEP_COPY: Record<StepId, { title: string; subtitle: string }> = {
    category: { title: '¿Qué tipo de equipo es?', subtitle: 'Elige la categoría que mejor lo describe.' },
    details: { title: 'Cuéntanos sobre tu equipo', subtitle: 'Un buen título y una descripción clara ayudan a que lo encuentren.' },
    photo: { title: 'Añade una foto', subtitle: COPY.photoFirstThing },
    price: { title: 'Fija tu precio', subtitle: '¿Cuánto cobras por día de renta?' },
    location: { title: '¿Dónde está tu equipo?', subtitle: COPY.originVisibility },
    quantity: { title: '¿Cuántas unidades tienes?', subtitle: 'Las que tienes disponibles para rentar.' },
    review: { title: 'Revisa tu anuncio', subtitle: '' },
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
    description: [maxLength(DESCRIPTION_MAX, 'La descripción admite hasta 2000 caracteres')],
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
    const { id: editListingId } = useLocalSearchParams<{ id?: string }>();
    const isEdit = !!editListingId;
    const router = useRouter();
    const colors = useTheme();
    const tileWidth = useTwoColumnWidth();

    const steps: StepId[] = isEdit
        ? ['category', 'details', 'photo', 'price', 'location', 'review']
        : ['category', 'details', 'photo', 'price', 'location', 'quantity', 'review'];
    const reviewIndex = steps.length - 1;

    const [loadingExisting, setLoadingExisting] = useState(isEdit);
    // Al editar se abre directamente la revisión (lista de secciones); al crear, el primer paso.
    const [step, setStep] = useState(isEdit ? reviewIndex : 0);
    // Cuando se llega a un paso desde la revisión, «Listo» regresa a la revisión.
    const [fromReview, setFromReview] = useState(false);
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

    // Hay cambios sin guardar si el estado difiere del inicial (vacío al crear, lo cargado al editar).
    const snapshot = JSON.stringify([text.values, extra]);
    const baseline = useRef<string | null>(null);
    useEffect(() => {
        if (!loadingExisting && baseline.current === null) baseline.current = snapshot;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingExisting]);
    const hasChanges = baseline.current !== null && snapshot !== baseline.current;

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
        const picked = await pickCoverImage();
        if (!picked) return;
        setExtra((prev) => ({ ...prev, coverUri: picked.uri, coverMime: picked.mime, photoChanged: true }));
        setStepError(null);
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
            // En iOS la geocodificación (CLGeocoder) no necesita permiso de ubicación; en Android la
            // documentación de expo-location lo exige, así que solo se pide ahí.
            if (Platform.OS === 'android') {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (!permission.granted) {
                    setGeocodeError('Necesitamos permiso de ubicación para ubicar tu dirección en el mapa. También puedes tocar el mapa para marcarla.');
                    return;
                }
            }

            const results = await Location.geocodeAsync(fullAddress);
            if (results.length === 0) {
                setGeocodeError('No pudimos encontrar esa dirección: puedes tocar el mapa para marcarla manualmente.');
                return;
            }

            setExtra((prev) => ({ ...prev, latitude: results[0].latitude, longitude: results[0].longitude }));
            setStepError(null);
        } catch {
            setGeocodeError('Error buscando la dirección: puedes tocar el mapa para marcarla manualmente.');
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
        setError(null);
        setStepError(null);
        if (fromReview) {
            setFromReview(false);
            setStep(reviewIndex);
            return;
        }
        setStep((s) => Math.max(0, s - 1));
    }

    function editSection(id: StepId) {
        setFromReview(true);
        setStep(steps.indexOf(id));
    }

    async function handleContinue() {
        if (publishing) return; // sin doble toque
        if (!validateStep()) return;
        if (currentStepId !== 'review') {
            if (fromReview) {
                setFromReview(false);
                setStep(reviewIndex);
            } else {
                setStep((s) => s + 1);
            }
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

        router.replace('/(provider)/listings' as never);
    }

    const categoryOptions = CATEGORIES.filter((c) => c.id !== 'all');
    const mapRegion =
        form.latitude !== null && form.longitude !== null
            ? { latitude: form.latitude, longitude: form.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : DEFAULT_REGION;

    const previewLines = [[form.brand, form.model].filter(Boolean).join(' · '), [form.city, form.state].filter(Boolean).join(', '), isEdit ? '' : `${form.quantity} ${form.quantity === 1 ? 'unidad disponible' : 'unidades disponibles'}`].filter(Boolean);
    const preview = <WizardPreviewCard uri={form.coverUri} title={form.title} lines={previewLines} price={priceFromInput(form.dailyPrice)} />;

    const reviewItems: ReviewItem[] = [
        { key: 'category', label: 'Categoría', value: CATEGORY_LABELS[form.category] ?? 'Sin elegir', onEdit: () => editSection('category') },
        { key: 'details', label: 'Detalles', value: [form.title, [form.brand, form.model].filter(Boolean).join(' · ')].filter(Boolean).join('\n') || 'Sin título', onEdit: () => editSection('details') },
        { key: 'photo', label: 'Foto', value: form.coverUri ? 'Foto añadida' : 'Sin foto', onEdit: () => editSection('photo') },
        { key: 'price', label: 'Precio', value: `${priceFromInput(form.dailyPrice)} por día`, onEdit: () => editSection('price') },
        { key: 'location', label: 'Ubicación', value: [form.addressLine1, [form.city, form.state].filter(Boolean).join(', ')].filter(Boolean).join('\n') || 'Sin ubicación', onEdit: () => editSection('location') },
        ...(isEdit ? [] : [{ key: 'quantity', label: 'Cantidad', value: `${form.quantity} ${form.quantity === 1 ? 'unidad' : 'unidades'}`, onEdit: () => editSection('quantity') }]),
    ];

    if (loadError) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <ScreenHeader title="" />
                <ErrorState fill error={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
            </SafeAreaView>
        );
    }

    if (loadingExisting) {
        return <ScreenSkeleton />;
    }

    const copy = STEP_COPY[currentStepId];
    const isReview = currentStepId === 'review';
    const nextLabel = isReview ? (isEdit ? 'Guardar cambios' : 'Publicar anuncio') : fromReview ? 'Listo' : 'Siguiente';
    const canGoBack = isReview ? !isEdit : step > 0 || fromReview;

    return (
        <WizardScaffold
            stepIndex={step}
            stepCount={steps.length}
            title={isReview && isEdit ? 'Edita tu anuncio' : copy.title}
            subtitle={isReview ? (isEdit ? COPY.previewListingUpdated : COPY.previewListingNew) : copy.subtitle}
            hasData={hasChanges}
            exitTitle={isEdit ? '¿Salir sin guardar?' : '¿Salir sin publicar?'}
            exitMessage={isEdit ? 'Si sales ahora, perderás los cambios que hiciste.' : 'Si sales ahora, perderás lo que escribiste.'}
            nextLabel={nextLabel}
            nextLoading={publishing}
            onNext={handleContinue}
            onBack={canGoBack ? handleBack : undefined}
            preview={isReview ? undefined : preview}
            scrollRef={text.scrollRef}
        >
            {currentStepId === 'category' && (
                <View style={{ gap: Rhythm.titleToContent }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Rhythm.cardGap }}>
                        {categoryOptions.map(({ id, label, icon }) => {
                            const active = form.category === id;
                            return (
                                <Pressable
                                    key={id}
                                    onPress={() => update('category', id)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: active }}
                                    accessibilityLabel={label}
                                    style={({ pressed }) => ({
                                        width: tileWidth,
                                        height: CATEGORY_TILE_HEIGHT,
                                        borderRadius: Radius.card,
                                        borderWidth: 2,
                                        borderColor: active ? colors.primary : colors.border,
                                        backgroundColor: active ? colors.primarySoft : colors.backgroundElement,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: Spacing.two,
                                        opacity: pressed ? 0.85 : 1,
                                    })}
                                >
                                    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={32} color={active ? colors.primary : colors.textSecondary} />
                                    <Text variant="bodyStrong" color={active ? 'primary' : 'text'}>
                                        {label}
                                    </Text>
                                    {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ position: 'absolute', top: Spacing.two, right: Spacing.two }} /> : null}
                                </Pressable>
                            );
                        })}
                    </View>
                    {stepError ? <FieldError message={stepError} /> : null}
                </View>
            )}

            {currentStepId === 'details' && (
                <View style={{ gap: Rhythm.titleToContent + Spacing.one }}>
                    <FormField label="Título del anuncio" placeholder="Ej. Bocina JBL PartyBox 300" maxLength={100} returnKeyType="next" {...text.field('title')} />
                    <View style={{ flexDirection: 'row', gap: Rhythm.cardGap }}>
                        <View style={{ flex: 1 }}>
                            <FormField label="Marca" placeholder="JBL" maxLength={60} {...text.field('brand')} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormField label="Modelo" placeholder="PartyBox 300" maxLength={60} {...text.field('model')} />
                        </View>
                    </View>
                    <FormField
                        label="Descripción"
                        placeholder={COPY.describeToClients}
                        multiline
                        maxLength={DESCRIPTION_MAX}
                        hint={`${form.description.length}/${DESCRIPTION_MAX} caracteres`}
                        {...text.field('description')}
                    />
                </View>
            )}

            {currentStepId === 'photo' && (
                <PhotoStep
                    uri={form.coverUri}
                    onPick={pickImage}
                    onRemove={() => setExtra((prev) => ({ ...prev, coverUri: null, coverMime: null, photoChanged: true }))}
                    error={stepError}
                    tip="Luz natural, fondo limpio y el equipo completo."
                />
            )}

            {currentStepId === 'price' && (
                <BigPriceInput binding={text.field('dailyPrice')} onChangeText={(v) => text.setValue('dailyPrice', v.replace(/[^0-9.]/g, ''))}>
                    <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
                        Es lo que cobras por cada día de renta.
                    </Text>
                </BigPriceInput>
            )}

            {currentStepId === 'location' && (
                <View style={{ gap: Rhythm.titleToContent + Spacing.one }}>
                    <FormField label="Dirección" placeholder="Calle y número" autoComplete="street-address" {...text.field('addressLine1')} />
                    <View style={{ flexDirection: 'row', gap: Rhythm.cardGap }}>
                        <View style={{ flex: 1 }}>
                            <FormField label="Ciudad" placeholder="Loja" {...text.field('city')} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormField label="Provincia" placeholder="Loja" {...text.field('state')} />
                        </View>
                    </View>
                    <FormField label="Código postal" placeholder="110150" keyboardType="number-pad" autoComplete="postal-code" {...text.field('postalCode')} />

                    <View style={{ gap: Rhythm.titleToContent }}>
                        <Text variant="bodyStrong">Confirma la ubicación en el mapa</Text>
                        <Button label="Buscar dirección" icon="search" onPress={geocodeAddress} loading={geocoding} />
                        {geocodeError ? <FieldError message={geocodeError} /> : null}
                        <View style={{ height: MAP_HEIGHT, borderRadius: Radius.card, overflow: 'hidden' }}>
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
                        <Text variant="caption" color="textSecondary">
                            {form.latitude !== null
                                ? 'Puedes arrastrar el pin o tocar el mapa para ajustarlo.'
                                : 'Toca «Buscar dirección» o toca directamente el mapa para marcar la ubicación.'}
                        </Text>
                        {stepError ? <FieldError message={stepError} /> : null}
                    </View>
                </View>
            )}

            {currentStepId === 'quantity' && (
                <View style={{ gap: Rhythm.titleToContent }}>
                    <QuantityStepper label="Unidades disponibles" value={form.quantity} max={MAX_QUANTITY} onChange={(q) => update('quantity', q)} />
                    <Text variant="caption" color="textSecondary">
                        No hace falta que anotes números de serie: los generamos automáticamente para tu inventario interno.
                    </Text>
                </View>
            )}

            {isReview && (
                <View style={{ gap: Rhythm.section }}>
                    {preview}
                    <ReviewSections items={reviewItems} />
                    {error ? <FormErrorBanner message={error} onRetry={handleContinue} retrying={publishing} /> : null}
                </View>
            )}
        </WizardScaffold>
    );
}
