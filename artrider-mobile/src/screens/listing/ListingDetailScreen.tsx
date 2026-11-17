import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailBottomBar, DetailSection, DetailSheet, MetaItem, MetaRow, ProviderRow, ReviewList } from '@/components/detail/DetailParts';
import { DetailHero } from '@/components/detail/DetailHero';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORY_LABELS } from '@/constants/categories';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getListingByIdWithProvider, getListingRatings, getListingReviews, type ListingWithProvider, type ListingReview } from '@/services/catalogService';
import { toggleFavorito, getUserFavIds } from '@/services/favoritosService';
import { findExistingConversation } from '@/services/messagesService';
import { getListingTotalUnits } from '@/services/availabilityService';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/utils/format';

/** Espacio para que la barra inferior fija no tape el final del contenido. */
const BOTTOM_BAR_CLEARANCE = 112;

export function ListingDetailScreen() {
  const { gutter } = useLayout();
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colors = useTheme();
    const { session } = useAuth();
    const { insets } = useLayout();

    const [listing, setListing] = useState<ListingWithProvider | null>(null);
    const [rating, setRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
    const [esFavorito, setEsFavorito] = useState(false);
    const [loading, setLoading] = useState(true);
    const [contacting, setContacting] = useState(false);
    const [totalUnits, setTotalUnits] = useState<number | null>(null);
    const [reviews, setReviews] = useState<ListingReview[]>([]);

    useEffect(() => {
        if (!id) return;

        async function load() {
            const data = await getListingByIdWithProvider(id);
            setListing(data);

            if (data) {
                const ratingsMap = await getListingRatings([data.id]);
                setRating({ avg: ratingsMap[data.id] ?? 0, count: 0 });
                getListingTotalUnits(data.id).then(setTotalUnits);
                getListingReviews(data.id).then(setReviews);
            }

            if (session?.user) {
                const favIds = await getUserFavIds();
                setEsFavorito(favIds.equipoIds.includes(id));
            }

            setLoading(false);
        }

        load();
    }, [id, session]);

    async function handleToggleFavorito() {
        if (!listing) return;
        setEsFavorito((prev) => !prev); // optimista
        const result = await toggleFavorito(listing.id, 'equipo');
        if (!result.error) setEsFavorito(result.esFavorito);
    }

    async function handleContactarProveedor() {
        if (!listing) return;
        if (!session?.user) {
            router.push('/login');
            return;
        }
        setContacting(true);
        try {
            const existingId = await findExistingConversation(listing.provider_id, listing.id, null);
            if (existingId) {
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: existingId, otherName: listing.provider?.brand_name ?? 'Proveedor' },
                });
            } else {
                router.push({
                    pathname: '/chat/[id]',
                    params: {
                        id: 'new',
                        otherName: listing.provider?.brand_name ?? 'Proveedor',
                        providerId: listing.provider_id,
                        listingId: listing.id,
                    },
                });
            }
        } catch (e) {
            console.error('[ListingDetailScreen] handleContactarProveedor:', e);
        } finally {
            setContacting(false);
        }
    }

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <Skeleton height={260} radius={0} />
                <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four, gap: Spacing.three }}>
                    <Skeleton width={90} height={24} radius={Radius.full} />
                    <Skeleton width="80%" height={28} />
                    <Skeleton width="50%" height={16} />
                    <Skeleton height={64} radius={Radius.card} />
                    <Skeleton height={96} radius={Radius.card} />
                </View>
            </View>
        );
    }

    if (!listing) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
                <EmptyState
                    icon="alert-circle-outline"
                    tone="error"
                    title="No encontramos este equipo"
                    description="Puede que ya no esté publicado."
                    actionLabel="Volver"
                    onAction={() => router.back()}
                />
            </SafeAreaView>
        );
    }

    const catLabel = CATEGORY_LABELS[listing.category ?? ''] ?? listing.category ?? 'Equipo';
    const isOwnListing = session?.user?.id && listing.provider?.user_id === session.user.id;
    const images = [listing.cover_image_url].filter((x): x is string => Boolean(x));
    const { latitude, longitude } = listing.address ?? {};

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BOTTOM_BAR_CLEARANCE + insets.bottom }}>
                <DetailHero images={images} esFavorito={esFavorito} onToggleFavorito={handleToggleFavorito} />

                <DetailSheet>
                    <View style={{ gap: Spacing.two, paddingBottom: Spacing.four }}>
                        <Badge label={catLabel} tone="accent" />
                        <Text variant="title">{listing.title ?? 'Equipo sin título'}</Text>

                        <MetaRow>
                            {rating.avg > 0 && (
                                <MetaItem icon="star" strong label={`${rating.avg.toFixed(2)}${reviews.length > 0 ? ` (${reviews.length})` : ''}`} />
                            )}
                            {listing.address?.city ? <MetaItem icon="location-outline" label={listing.address.city} /> : null}
                            {totalUnits !== null && (
                                <MetaItem
                                    icon="cube-outline"
                                    label={totalUnits === 0 ? 'Sin unidades registradas' : `${totalUnits} ${totalUnits === 1 ? 'unidad' : 'unidades'} en stock`}
                                />
                            )}
                        </MetaRow>
                    </View>

                    <DetailSection>
                        <ProviderRow brandName={listing.provider?.brand_name} onPress={handleContactarProveedor} />
                    </DetailSection>

                    {(listing.brand || listing.model) && (
                        <DetailSection>
                            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                                {listing.brand ? <SpecTile label="Marca" value={listing.brand} /> : null}
                                {listing.model ? <SpecTile label="Modelo" value={listing.model} /> : null}
                            </View>
                        </DetailSection>
                    )}

                    {listing.description ? (
                        <DetailSection title="Sobre este equipo">
                            <Text variant="body" color="textSecondary">
                                {listing.description}
                            </Text>
                        </DetailSection>
                    ) : null}

                    <ReviewList rating={rating.avg} reviews={reviews} emptyText="Sé el primero en reseñar este equipo." />

                    {latitude && longitude ? (
                        <DetailSection title="Ubicación">
                            <View style={{ aspectRatio: 16 / 9, borderRadius: Radius.card, overflow: 'hidden' }}>
                                <MapView
                                    style={{ flex: 1 }}
                                    initialRegion={{ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                >
                                    <Marker coordinate={{ latitude, longitude }} />
                                </MapView>
                            </View>
                        </DetailSection>
                    ) : null}
                </DetailSheet>
            </ScrollView>

            {!isOwnListing && (
                <DetailBottomBar
                    priceLabel={formatPrice(listing.daily_price)}
                    onChat={handleContactarProveedor}
                    chatLoading={contacting}
                    onAddToCart={() => router.push(`/checkout/${listing.id}?mode=cart` as never)}
                    onReserve={() => router.push(`/checkout/${listing.id}` as never)}
                />
            )}
        </View>
    );
}

function SpecTile({ label, value }: { label: string; value: string }) {
    const colors = useTheme();
    return (
        <View style={{ flex: 1, backgroundColor: colors.backgroundElement, borderRadius: Radius.xl, padding: Spacing.three, gap: Spacing.half }}>
            <Text variant="caption" color="textSecondary">
                {label}
            </Text>
            <Text variant="bodyStrong" numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
}
