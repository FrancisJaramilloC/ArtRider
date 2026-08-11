import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ImageGallery } from '@/components/listing/ImageGallery';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_LABELS } from '@/constants/categories';
import { getListingByIdWithProvider, getListingRatings, getListingReviews, type ListingWithProvider, type ListingReview } from '@/services/catalogService';
import { toggleFavorito, getUserFavIds } from '@/services/favoritosService';
import { findExistingConversation } from '@/services/messagesService';
import { getListingTotalUnits } from '@/services/availabilityService';
import { useAuth } from '@/hooks/useAuth';

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Hoy';
    if (days === 1) return 'Hace 1 día';
    if (days < 30) return `Hace ${days} días`;
    const months = Math.floor(days / 30);
    if (months < 12) return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
    const years = Math.floor(months / 12);
    return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

export function ListingDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { session } = useAuth();

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

    if (loading || !listing) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    const price = listing.daily_price / 100;
    const catLabel = CATEGORY_LABELS[listing.category ?? ''] ?? listing.category ?? 'Equipo';
    const isOwnListing = session?.user?.id && listing.provider?.user_id === session.user.id;
    const images = [listing.cover_image_url].filter((x): x is string => Boolean(x));

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView bounces={false}>
                <ImageGallery images={images} />

                <Pressable
                    onPress={handleToggleFavorito}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: Spacing.four,
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name={esFavorito ? 'heart' : 'heart-outline'} size={20} color={esFavorito ? '#C026D3' : '#fff'} />
                </Pressable>

                <View style={{ padding: Spacing.four }}>
                    <View
                        style={{
                            alignSelf: 'flex-start',
                            backgroundColor: `${colors.primary}15`,
                            paddingHorizontal: Spacing.two,
                            paddingVertical: 5,
                            borderRadius: 999,
                            marginBottom: Spacing.two,
                        }}
                    >
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.primary }}>
                            {catLabel}
                        </ThemedText>
                    </View>

                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginBottom: Spacing.one }}>
                        {listing.title ?? 'Equipo sin título'}
                    </ThemedText>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one }}>
                        {rating.avg > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="star" size={14} color={colors.text} />
                                <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text }}>
                                    {rating.avg.toFixed(2)}
                                </ThemedText>
                                {reviews.length > 0 && (
                                    <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>
                                        ({reviews.length})
                                    </ThemedText>
                                )}
                            </View>
                        )}
                        {listing.address?.city && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{listing.address.city}</ThemedText>
                            </View>
                        )}
                    </View>

                    {totalUnits !== null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.three }}>
                            <Ionicons name="cube-outline" size={13} color={colors.textSecondary} />
                            <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary }}>
                                {totalUnits === 0
                                    ? 'Sin unidades registradas'
                                    : `${totalUnits} ${totalUnits === 1 ? 'unidad' : 'unidades'} en stock`}
                            </ThemedText>
                        </View>
                    )}

                    <Pressable
                        onPress={handleContactarProveedor}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.three,
                            paddingVertical: Spacing.three,
                            borderTopWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <View
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: colors.text,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ThemedText style={{ color: colors.background, fontFamily: 'Inter_700Bold', fontSize: 16 }}>
                                {(listing.provider?.brand_name ?? 'P').charAt(0).toUpperCase()}
                            </ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                                Ofrecido por {listing.provider?.brand_name ?? 'Proveedor ArtRider'}
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Proveedor verificado</ThemedText>
                            </View>
                        </View>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                    </Pressable>

                    {(listing.brand || listing.model) && (
                        <View style={{ flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                            {listing.brand && (
                                <View style={{ flex: 1, backgroundColor: colors.backgroundElement, borderRadius: Radius.md, padding: Spacing.two }}>
                                    <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>Marca</ThemedText>
                                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.text }}>{listing.brand}</ThemedText>
                                </View>
                            )}
                            {listing.model && (
                                <View style={{ flex: 1, backgroundColor: colors.backgroundElement, borderRadius: Radius.md, padding: Spacing.two }}>
                                    <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>Modelo</ThemedText>
                                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.text }}>{listing.model}</ThemedText>
                                </View>
                            )}
                        </View>
                    )}

                    {listing.description && (
                        <View style={{ paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.two }}>
                                Sobre este equipo
                            </ThemedText>
                            <ThemedText style={{ fontSize: 14, lineHeight: 21, color: colors.textSecondary }}>
                                {listing.description}
                            </ThemedText>
                        </View>
                    )}

                    {/* Reseñas — item 025 */}
                    <View style={{ paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
                            {rating.avg > 0 && <Ionicons name="star" size={16} color={colors.text} />}
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>
                                {rating.avg > 0 ? `${rating.avg.toFixed(2)} · ${reviews.length} ${reviews.length === 1 ? 'reseña' : 'reseñas'}` : 'Reseñas'}
                            </ThemedText>
                        </View>

                        {reviews.length === 0 ? (
                            <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>
                                Sé el primero en reseñar este equipo.
                            </ThemedText>
                        ) : (
                            reviews.map((review) => (
                                <View key={review.id} style={{ marginBottom: Spacing.four }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two }}>
                                        <View
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 16,
                                                backgroundColor: colors.backgroundElement,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.text }}>
                                                {review.author_name.charAt(0).toUpperCase()}
                                            </ThemedText>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: colors.text }}>
                                                {review.author_name}
                                            </ThemedText>
                                            <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary }}>
                                                {formatRelativeTime(review.created_at)}
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <Ionicons
                                                key={n}
                                                name={n <= review.rating ? 'star' : 'star-outline'}
                                                size={13}
                                                color={n <= review.rating ? colors.primary : colors.textSecondary}
                                            />
                                        ))}
                                    </View>
                                    {review.comment && (
                                        <ThemedText style={{ fontSize: 13.5, lineHeight: 20, color: colors.textSecondary }}>
                                            {review.comment}
                                        </ThemedText>
                                    )}
                                </View>
                            ))
                        )}
                    </View>

                    {listing.address?.latitude && listing.address?.longitude && (
                        <View style={{ paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.two }}>
                                Ubicación
                            </ThemedText>
                            <View style={{ height: 180, borderRadius: Radius.lg, overflow: 'hidden' }}>
                                <MapView
                                    style={{ flex: 1 }}
                                    initialRegion={{
                                        latitude: listing.address.latitude,
                                        longitude: listing.address.longitude,
                                        latitudeDelta: 0.02,
                                        longitudeDelta: 0.02,
                                    }}
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                >
                                    <Marker coordinate={{ latitude: listing.address.latitude, longitude: listing.address.longitude }} />
                                </MapView>
                            </View>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {!isOwnListing && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.two,
                        padding: Spacing.four,
                        backgroundColor: colors.background,
                        borderTopWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <Pressable
                        onPress={handleContactarProveedor}
                        disabled={contacting}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: Radius.lg,
                            borderWidth: 1,
                            borderColor: colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {contacting ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.text} />
                        )}
                    </Pressable>

                    <Pressable
                        onPress={() => router.push(`/checkout/${listing.id}?mode=cart` as any)}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: Radius.lg,
                            borderWidth: 1,
                            borderColor: colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="cart-outline" size={19} color={colors.text} />
                    </Pressable>

                    <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text }}>
                            ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
                            <ThemedText style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}> /día</ThemedText>
                        </ThemedText>
                    </View>

                    <Pressable
                        onPress={() => router.push(`/checkout/${listing.id}` as any)}
                        style={{ backgroundColor: colors.primary, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: Radius.lg }}
                    >
                        <ThemedText style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 }}>Reservar</ThemedText>
                    </Pressable>
                </View>
            )}
        </View>
    );
}