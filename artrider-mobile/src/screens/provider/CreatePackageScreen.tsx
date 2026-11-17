import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigPriceInput, FieldError, PhotoStep, ReviewSections, WizardPreviewCard, pickCoverImage, priceFromInput, type ReviewItem } from '@/components/provider/WizardParts';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { WizardScaffold } from '@/components/ui/WizardScaffold';
import { COPY } from '@/constants/copy';
import { Radius, Rhythm, Spacing, Thumb } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useForm } from '@/hooks/useForm';
import { useTheme } from '@/hooks/use-theme';
import { createPackage, getMyListings, getPackageForEdit, updatePackage } from '@/services/providerCatalogService';
import { toErrorInfo, type ErrorInfo } from '@/utils/errors';
import { formatPrice } from '@/utils/format';
import { integerAtLeast, maxLength, minLength, positivePrice, required } from '@/utils/validation';

const DESCRIPTION_MAX = 2000;

type StepId = 'items' | 'details' | 'capacity' | 'photo' | 'price' | 'review';
const STEPS: StepId[] = ['items', 'details', 'capacity', 'photo', 'price', 'review'];
const REVIEW_INDEX = STEPS.length - 1;

const STEP_COPY: Record<StepId, { title: string; subtitle: string }> = {
    items: { title: '¿Qué equipos incluye?', subtitle: 'Elige los equipos del paquete y cuántas unidades de cada uno.' },
    details: { title: 'Cuéntanos sobre el paquete', subtitle: 'Un buen título y para qué evento es ideal.' },
    capacity: { title: '¿Para cuántas personas?', subtitle: 'La capacidad que cubre este paquete.' },
    photo: { title: 'Añade una foto', subtitle: 'Una foto que represente bien el paquete completo.' },
    price: { title: 'Fija tu precio', subtitle: '¿Cuánto cobras por día por el paquete completo?' },
    review: { title: 'Revisa tu paquete', subtitle: '' },
};

const EMPTY_TEXT = { title: '', description: '', capacity: '', dailyPrice: '' };

const TEXT_RULES = {
    title: [required('Ingresa un título para el paquete'), minLength(3, 'El título debe tener al menos 3 caracteres'), maxLength(100, 'El título admite hasta 100 caracteres')],
    description: [maxLength(DESCRIPTION_MAX, 'La descripción admite hasta 2000 caracteres')],
    capacity: [required('Ingresa para cuántas personas alcanza'), integerAtLeast(1, 'Ingresa un número de personas mayor a 0')],
    dailyPrice: [required('Ingresa el precio por día'), positivePrice('Ingresa un precio mayor a 0')],
};

/** Campos de texto que se validan en cada paso. */
const STEP_FIELDS: Partial<Record<StepId, (keyof typeof EMPTY_TEXT)[]>> = {
    details: ['title', 'description'],
    capacity: ['capacity'],
    price: ['dailyPrice'],
};

export function CreatePackageScreen() {
    const { id: editPackageId } = useLocalSearchParams<{ id?: string }>();
    const isEdit = !!editPackageId;
    const router = useRouter();
    const colors = useTheme();

    const [loadingExisting, setLoadingExisting] = useState(isEdit);
    // Al editar se abre directamente la revisión; al crear, el primer paso.
    const [step, setStep] = useState(isEdit ? REVIEW_INDEX : 0);
    const [fromReview, setFromReview] = useState(false);
    const listingsLoad = useAsyncData(async () => (await getMyListings()).filter((l) => l.is_published));
    const myListings = listingsLoad.data ?? [];
    const [selected, setSelected] = useState<Record<string, number>>({});
    const text = useForm(EMPTY_TEXT, TEXT_RULES);
    const { title, capacity, dailyPrice } = text.values;
    const [stepError, setStepError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<ErrorInfo | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [coverUri, setCoverUri] = useState<string | null>(null);
    const [coverMime, setCoverMime] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Hay cambios sin guardar si el estado difiere del inicial (vacío al crear, lo cargado al editar).
    const snapshot = JSON.stringify([text.values, selected, coverUri]);
    const baseline = useRef<string | null>(null);
    useEffect(() => {
        if (!loadingExisting && baseline.current === null) baseline.current = snapshot;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingExisting]);
    const hasChanges = baseline.current !== null && snapshot !== baseline.current;

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
                data.items.forEach((item) => {
                    preselected[item.listingId] = item.quantity;
                });
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
        const picked = await pickCoverImage();
        if (!picked) return;
        setCoverUri(picked.uri);
        setCoverMime(picked.mime);
        setStepError(null);
    }

    const currentStepId = STEPS[step];
    const selectedCount = Object.keys(selected).length;

    /** Referencia informativa: lo que costarían los equipos elegidos por separado (precio × cantidad, por día). */
    const separateTotalCents = myListings.reduce((sum, l) => sum + (selected[l.id] ? l.daily_price * selected[l.id] : 0), 0);

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
        setError(null);
        setStepError(null);
        if (fromReview) {
            setFromReview(false);
            setStep(REVIEW_INDEX);
            return;
        }
        setStep((s) => Math.max(0, s - 1));
    }

    function editSection(id: StepId) {
        setFromReview(true);
        setStep(STEPS.indexOf(id));
    }

    async function handleContinue() {
        if (publishing) return; // sin doble toque
        if (!validateStep()) return;
        if (currentStepId !== 'review') {
            if (fromReview) {
                setFromReview(false);
                setStep(REVIEW_INDEX);
            } else {
                setStep((s) => s + 1);
            }
            return;
        }

        setError(null);
        setPublishing(true);
        const items = Object.entries(selected).map(([listingId, quantity]) => ({ listingId, quantity }));

        if (isEdit && editPackageId) {
            const result = await updatePackage({
                packageId: editPackageId,
                title,
                description: text.values.description,
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
                description: text.values.description,
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

        router.replace('/(provider)/listings' as never);
    }

    const equiposLabel = `${selectedCount} ${selectedCount === 1 ? 'equipo' : 'equipos'}`;
    const preview = (
        <WizardPreviewCard
            uri={coverUri}
            title={title}
            lines={[`Hasta ${capacity || '0'} personas`, `${equiposLabel} ${selectedCount === 1 ? 'incluido' : 'incluidos'}`]}
            price={priceFromInput(dailyPrice)}
        />
    );

    const selectedNames = myListings.filter((l) => selected[l.id]).map((l) => `${selected[l.id]}× ${l.title ?? 'Equipo'}`);
    const reviewItems: ReviewItem[] = [
        { key: 'items', label: 'Equipos', value: selectedNames.join('\n') || 'Sin equipos', onEdit: () => editSection('items') },
        { key: 'details', label: 'Detalles', value: title || 'Sin título', onEdit: () => editSection('details') },
        { key: 'capacity', label: 'Capacidad', value: `Hasta ${capacity || '0'} personas`, onEdit: () => editSection('capacity') },
        { key: 'photo', label: 'Foto', value: coverUri ? 'Foto añadida' : 'Sin foto', onEdit: () => editSection('photo') },
        { key: 'price', label: 'Precio', value: `${priceFromInput(dailyPrice)} por día`, onEdit: () => editSection('price') },
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
    const nextLabel = isReview ? (isEdit ? 'Guardar cambios' : 'Publicar paquete') : fromReview ? 'Listo' : 'Siguiente';
    const canGoBack = isReview ? !isEdit : step > 0 || fromReview;

    return (
        <WizardScaffold
            stepIndex={step}
            stepCount={STEPS.length}
            title={isReview && isEdit ? 'Edita tu paquete' : copy.title}
            subtitle={isReview ? (isEdit ? COPY.previewPackageUpdated : COPY.previewListingNew) : copy.subtitle}
            hasData={hasChanges}
            exitTitle={isEdit ? '¿Salir sin guardar?' : '¿Salir sin publicar?'}
            exitMessage={isEdit ? 'Si sales ahora, perderás los cambios que hiciste.' : 'Si sales ahora, perderás lo que escribiste.'}
            nextLabel={nextLabel}
            nextLoading={publishing}
            onNext={handleContinue}
            onBack={canGoBack ? handleBack : undefined}
            preview={isReview ? undefined : preview}
            scrollRef={text.scrollRef}
            onScroll={text.onScroll}
            footerNote={
                currentStepId === 'items' && myListings.length > 0 ? (
                    <Text variant="captionStrong" color={selectedCount > 0 ? 'primary' : 'textSecondary'} accessibilityLiveRegion="polite">
                        {selectedCount === 0 ? 'Ningún equipo seleccionado' : `${selectedCount} ${selectedCount === 1 ? 'equipo seleccionado' : 'equipos seleccionados'}`}
                    </Text>
                ) : undefined
            }
        >
            {currentStepId === 'items' && (
                <View style={{ gap: Rhythm.titleToContent }}>
                    {stepError ? <FieldError message={stepError} /> : null}
                    {listingsLoad.status === 'error' ? (
                        <ErrorState error={listingsLoad.error} onRetry={listingsLoad.reload} />
                    ) : listingsLoad.status === 'loading' ? (
                        <View style={{ gap: Rhythm.cardGap }}>
                            {[0, 1, 2].map((i) => (
                                <Skeleton key={i} height={Thumb.list + Spacing.four} radius={Radius.card} />
                            ))}
                        </View>
                    ) : myListings.length === 0 ? (
                        <EmptyState
                            icon="cube-outline"
                            title="Primero publica un equipo"
                            description="Todavía no tienes equipos publicados: publica al menos un equipo individual para poder armar un paquete con ellos."
                            actionLabel="Publicar un equipo"
                            onAction={() => router.push('/provider/create-listing' as never)}
                        />
                    ) : (
                        <View style={{ gap: Rhythm.cardGap }}>
                            {myListings.map((listing) => {
                                const isSelected = !!selected[listing.id];
                                return (
                                    <View
                                        key={listing.id}
                                        style={{
                                            borderRadius: Radius.card,
                                            borderWidth: 2,
                                            borderColor: isSelected ? colors.primary : colors.border,
                                            backgroundColor: isSelected ? colors.primarySoft : colors.background,
                                            padding: Rhythm.cardPadding,
                                            gap: Rhythm.cardPadding,
                                        }}
                                    >
                                        <Pressable
                                            onPress={() => toggleItem(listing.id)}
                                            accessibilityRole="checkbox"
                                            accessibilityState={{ checked: isSelected }}
                                            accessibilityLabel={`${listing.title ?? 'Equipo'}, ${formatPrice(listing.daily_price)} por día`}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: Thumb.compact }}
                                        >
                                            <View style={{ width: Thumb.compact, height: Thumb.compact, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.imageBackdrop, alignItems: 'center', justifyContent: 'center' }}>
                                                {listing.cover_image_url ? (
                                                    <Image source={{ uri: listing.cover_image_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityIgnoresInvertColors />
                                                ) : (
                                                    <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
                                                )}
                                            </View>
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Text variant="bodyStrong" numberOfLines={2}>
                                                    {listing.title ?? 'Equipo'}
                                                </Text>
                                                <Text variant="caption" color="textSecondary">
                                                    {formatPrice(listing.daily_price)} por día
                                                </Text>
                                            </View>
                                            <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={isSelected ? colors.primary : colors.textMuted} />
                                        </Pressable>
                                        {isSelected ? (
                                            <QuantityStepper label="Unidades" value={selected[listing.id]} max={99} onChange={(q) => setItemQuantity(listing.id, q)} />
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            )}

            {currentStepId === 'details' && (
                <View style={{ gap: Rhythm.titleToContent + Spacing.one }}>
                    <FormField label="Título del paquete" placeholder="Ej. Paquete Fiesta Completa" maxLength={100} returnKeyType="next" {...text.field('title')} />
                    <FormField
                        label="Descripción"
                        placeholder="Cuenta para qué tipo de evento es ideal este paquete..."
                        multiline
                        maxLength={DESCRIPTION_MAX}
                        hint={`${text.values.description.length}/${DESCRIPTION_MAX} caracteres`}
                        {...text.field('description')}
                    />
                </View>
            )}

            {currentStepId === 'capacity' && (
                <FormField
                    label="Capacidad (personas)"
                    leftIcon="people-outline"
                    placeholder="0"
                    keyboardType="number-pad"
                    maxLength={5}
                    {...text.field('capacity')}
                    onChangeText={(v) => text.setValue('capacity', v.replace(/[^0-9]/g, ''))}
                />
            )}

            {currentStepId === 'photo' && (
                <PhotoStep
                    uri={coverUri}
                    onPick={pickImage}
                    onRemove={() => {
                        setCoverUri(null);
                        setCoverMime(null);
                    }}
                    error={stepError}
                    tip="Luz natural, fondo limpio y todos los equipos del paquete a la vista."
                />
            )}

            {currentStepId === 'price' && (
                <BigPriceInput binding={text.field('dailyPrice')} onChangeText={(v) => text.setValue('dailyPrice', v.replace(/[^0-9.]/g, ''))}>
                    {separateTotalCents > 0 ? (
                        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
                            Los equipos por separado suman {formatPrice(separateTotalCents)}/día
                        </Text>
                    ) : null}
                </BigPriceInput>
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
