import { COPY, ROLE_PROVIDER } from '@/constants/copy';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';

import { DetailSection, ExpandableText, ItemCarousel, MetaItem, MetaRow, ProviderRow, ReviewList, SpecGrid, type SpecItem } from '@/components/detail/DetailParts';
import { DetailCartFooter } from '@/components/detail/DetailCartFooter';
import { DetailMessage, DetailScaffold, DetailSkeleton } from '@/components/detail/DetailScaffold';
import { Badge } from '@/components/ui/Badge';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Text } from '@/components/ui/Text';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { CATEGORY_LABELS } from '@/constants/categories';
import { getListingByIdWithProvider, getListingGallery, getListingRatings, getListingReviews, type ListingWithProvider, type ListingReview } from '@/services/catalogService';
import { toggleFavorito, getUserFavIds } from '@/services/favoritosService';
import { findExistingConversation } from '@/services/messagesService';
import { getListingTotalUnits } from '@/services/availabilityService';
import { emitFavoriteChange, onFavoriteChange } from '@/utils/favoritesSync';
import { useAuth } from '@/hooks/useAuth';
import { cityOrNull } from '@/utils/city';
import { loadRelatedListings } from './relatedListings';

type ListingBundle = { listing: ListingWithProvider | null; rating: number; totalUnits: number | null; reviews: ListingReview[]; fav: boolean; gallery: string[]; galleryFailed: boolean };

export function ListingDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { session } = useAuth();

    const [esFavorito, setEsFavorito] = useState(false);

    // Dato principal: el equipo (si falla → ErrorState). Lo secundario (valoración, stock, reseñas,
    // favoritos) degrada en silencio para no bloquear la pantalla.
    const { status, data: bundle, error, reload } = useAsyncData<ListingBundle>(
        async () => {
            const listing = await getListingByIdWithProvider(id);
            if (!listing) return { listing: null, rating: 0, totalUnits: null, reviews: [], fav: false, gallery: [], galleryFailed: false };
            let galleryFailed = false;
            const [ratingsMap, totalUnits, reviews, favIds, gallery] = await Promise.all([
                getListingRatings([listing.id]).catch(() => ({}) as Record<string, number>),
                getListingTotalUnits(listing.id).catch(() => null),
                getListingReviews(listing.id).catch(() => [] as ListingReview[]),
                session?.user ? getUserFavIds().catch(() => null) : Promise.resolve(null),
                // Solo la galería: si falla, el detalle sigue con la portada y un aviso.
                getListingGallery(listing.id).catch((e) => {
                    galleryFailed = true;
                    console.warn(e instanceof Error ? e.message : e);
                    return [] as string[];
                }),
            ]);
            return { listing, rating: ratingsMap[listing.id] ?? 0, totalUnits, reviews, fav: favIds?.equipoIds.includes(id) ?? false, gallery, galleryFailed };
        },
        { enabled: !!id, deps: [id, session] },
    );
    const listing = bundle?.listing ?? null;
    const rating = { avg: bundle?.rating ?? 0, count: 0 };
    const totalUnits = bundle?.totalUnits ?? null;
    const reviews = bundle?.reviews ?? [];

    // Secundario y no bloqueante: si falla simplemente no se muestran los carruseles.
    const { data: related } = useAsyncData(
        () => (listing ? loadRelatedListings(listing.provider_id, listing.id, listing.category).catch(() => null) : Promise.resolve(null)),
        { enabled: !!listing, deps: [listing?.id] },
    );

    useEffect(() => {
        if (bundle) setEsFavorito(bundle.fav);
    }, [bundle]);

    // Si se cambia el favorito desde otro lado (lista de Favoritos, tarjetas), el corazón se actualiza sin recargar.
    useEffect(
        () =>
            onFavoriteChange((c) => {
                if (c.tipo === 'equipo' && c.id === id) setEsFavorito(c.esFavorito);
            }),
        [id],
    );

    async function handleToggleFavorito() {
        if (!listing) return;
        setEsFavorito((prev) => !prev); // optimista
        const result = await toggleFavorito(listing.id, 'equipo');
        if (!result.error) {
            setEsFavorito(result.esFavorito);
            emitFavoriteChange({ id: listing.id, tipo: 'equipo', esFavorito: result.esFavorito });
        }
    }

    async function handleContactarProveedor() {
        if (!listing) return;
        if (!session?.user) {
            router.push('/login');
            return;
        }
        try {
            const existingId = await findExistingConversation(listing.provider_id, listing.id, null);
            if (existingId) {
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: existingId, otherName: listing.provider?.brand_name ?? ROLE_PROVIDER },
                });
            } else {
                router.push({
                    pathname: '/chat/[id]',
                    params: {
                        id: 'new',
                        otherName: listing.provider?.brand_name ?? ROLE_PROVIDER,
                        providerId: listing.provider_id,
                        listingId: listing.id,
                    },
                });
            }
        } catch (e) {
            console.error('[ListingDetailScreen] handleContactarProveedor:', e);
        }
    }

    if (status === 'loading') return <DetailSkeleton />;
    if (status === 'error') return <DetailMessage kind="error" error={error} onRetry={reload} />;
    if (!listing) return <DetailMessage kind="not-found" title="No encontramos este equipo" onBack={() => router.back()} />;

    const catLabel = CATEGORY_LABELS[listing.category ?? ''] ?? listing.category ?? 'Equipo';
    // Portada primero y luego la galería, sin duplicados (la portada suele repetirse como foto 1).
    const images = Array.from(new Set([listing.cover_image_url, ...(bundle?.gallery ?? [])].filter((x): x is string => Boolean(x))));
    const { latitude, longitude } = listing.address ?? {};
    const specs: SpecItem[] = [
        listing.brand ? { label: 'Marca', value: listing.brand } : null,
        listing.model ? { label: 'Modelo', value: listing.model } : null,
    ].filter((x): x is SpecItem => x !== null);

    return (
        <DetailScaffold
            title={listing.title ?? 'Equipo'}
            images={images}
            esFavorito={esFavorito}
            onToggleFavorito={handleToggleFavorito}
            notice={bundle?.galleryFailed ? "No pudimos cargar todas las fotos. Mostramos la portada." : undefined}
            footer={<DetailCartFooter kind="listing" id={listing.id} title={listing.title ?? 'Equipo'} dailyPrice={listing.daily_price} providerId={listing.provider_id} />}
        >
            <View style={{ gap: Rhythm.titleToContent }}>
                <Badge label={catLabel} tone="accent" />
                <Text variant="title">{listing.title ?? 'Equipo sin título'}</Text>

                <MetaRow>
                    {rating.avg > 0 && <MetaItem icon="star" strong label={`${rating.avg.toFixed(2)}${reviews.length > 0 ? ` (${reviews.length})` : ''}`} />}
                    {cityOrNull(listing.address?.city) ? <MetaItem icon="location-outline" label={cityOrNull(listing.address?.city)!} /> : null}
                    {totalUnits !== null && (
                        <MetaItem
                            icon="cube-outline"
                            label={totalUnits === 0 ? 'Sin unidades registradas' : `${totalUnits} ${totalUnits === 1 ? 'unidad' : 'unidades'} en stock`}
                        />
                    )}
                </MetaRow>
            </View>

            <DetailSection divider>
                <ProviderRow brandName={listing.provider?.brand_name} city={cityOrNull(listing.address?.city)} onPress={handleContactarProveedor} />
            </DetailSection>

            {listing.category ? (
                <DetailSection title="Categoría">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                        <Badge label={catLabel} tone="neutral" />
                    </View>
                </DetailSection>
            ) : null}

            {specs.length > 0 ? (
                <DetailSection title="Especificaciones">
                    <SpecGrid items={specs} />
                </DetailSection>
            ) : null}

            {listing.description ? (
                <DetailSection title="Descripción">
                    <ExpandableText text={listing.description} />
                </DetailSection>
            ) : null}

            <ReviewList rating={rating.avg} reviews={reviews} emptyText="Sé el primero en reseñar este equipo." />

            {latitude && longitude ? (
                <DetailSection title="Ubicación" divider>
                    <View style={{ aspectRatio: 16 / 9, borderRadius: Radius.card, overflow: 'hidden' }}>
                        <MapView style={{ flex: 1 }} initialRegion={{ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }} scrollEnabled={false} zoomEnabled={false}>
                            <Marker coordinate={{ latitude, longitude }} />
                        </MapView>
                    </View>
                </DetailSection>
            ) : null}

            {related?.fromProvider.length ? (
                <DetailSection title={COPY.moreFromProvider} divider>
                    <ItemCarousel items={related.fromProvider} favoriteIds={related.favoriteIds} />
                </DetailSection>
            ) : null}

            {related?.similar.length ? (
                <DetailSection title="Equipos similares">
                    <ItemCarousel items={related.similar} favoriteIds={related.favoriteIds} />
                </DetailSection>
            ) : null}
        </DetailScaffold>
    );
}
