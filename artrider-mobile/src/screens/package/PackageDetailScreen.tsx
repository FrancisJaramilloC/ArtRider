import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Image, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getPackageById, getPackageReviews, type PackageWithItems, type PackageReview } from '@/services/packagesService';
import { toggleFavorito, getUserFavIds } from '@/services/favoritosService';
import { findExistingConversation } from '@/services/messagesService';
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

export function PackageDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { session } = useAuth();

    const [pkg, setPkg] = useState<PackageWithItems | null>(null);
    const [esFavorito, setEsFavorito] = useState(false);
    const [loading, setLoading] = useState(true);
    const [contacting, setContacting] = useState(false);
    const [reviews, setReviews] = useState<PackageReview[]>([]);

    useEffect(() => {
        if (!id) return;

        async function load() {
            const data = await getPackageById(id);
            setPkg(data);

            if (data) {
                getPackageReviews(data.id).then(setReviews);
            }

            if (session?.user) {
                const favIds = await getUserFavIds();
                setEsFavorito(favIds.paqueteIds.includes(id));
            }

            setLoading(false);
        }

        load();
    }, [id, session]);

    async function handleToggleFavorito() {
        if (!pkg) return;
        setEsFavorito((prev) => !prev);
        const result = await toggleFavorito(pkg.id, 'paquete');
        if (!result.error) setEsFavorito(result.esFavorito);
    }

    async function handleContactarProveedor() {
        if (!pkg) return;
        if (!session?.user) {
            router.push('/login');
            return;
        }
        setContacting(true);
        try {
            const existingId = await findExistingConversation(pkg.provider_id, null, pkg.id);
            if (existingId) {
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: existingId, otherName: pkg.provider?.brand_name ?? 'Proveedor' },
                });
            } else {
                router.push({
                    pathname: '/chat/[id]',
                    params: {
                        id: 'new',
                        otherName: pkg.provider?.brand_name ?? 'Proveedor',
                        providerId: pkg.provider_id,
                        packageId: pkg.id,
                    },
                });
            }
        } catch (e) {
            console.error('[PackageDetailScreen] handleContactarProveedor:', e);
        } finally {
            setContacting(false);
        }
    }

    if (loading || !pkg) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    const price = pkg.daily_price / 100;
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView bounces={false}>
                <View style={{ width: '100%', height: 260 }}>
                    {pkg.cover_image_url ? (
                        <Image source={{ uri: pkg.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                    )}
                </View>

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
                            Paquete
                        </ThemedText>
                    </View>

                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginBottom: Spacing.one }}>
                        {pkg.title}
                    </ThemedText>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three }}>
                        {avgRating > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="star" size={14} color={colors.text} />
                                <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text }}>
                                    {avgRating.toFixed(2)}
                                </ThemedText>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>({reviews.length})</ThemedText>
                            </View>
                        )}
                        {pkg.capacity_people != null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>
                                    Hasta {pkg.capacity_people} {pkg.capacity_people === 1 ? 'persona' : 'personas'}
                                </ThemedText>
                            </View>
                        )}
                    </View>

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
                                {(pkg.provider?.brand_name ?? 'P').charAt(0).toUpperCase()}
                            </ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                                Ofrecido por {pkg.provider?.brand_name ?? 'Proveedor ArtRider'}
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Proveedor verificado</ThemedText>
                            </View>
                        </View>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                    </Pressable>

                    {pkg.description && (
                        <View style={{ paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.two }}>
                                Sobre este paquete
                            </ThemedText>
                            <ThemedText style={{ fontSize: 14, lineHeight: 21, color: colors.textSecondary }}>
                                {pkg.description}
                            </ThemedText>
                        </View>
                    )}

                    <View style={{ paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.three }}>
                            Equipos incluidos
                        </ThemedText>
                        {pkg.items.map((item) => (
                            <View
                                key={item.id}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three }}
                            >
                                <View style={{ width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: colors.backgroundElement }}>
                                    {item.listing?.cover_image_url ? (
                                        <Image source={{ uri: item.listing.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    ) : (
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
                                        </View>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text }}>
                                        {item.listing?.title ?? 'Equipo no disponible'}
                                    </ThemedText>
                                    {(item.listing?.brand || item.listing?.model) && (
                                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                                            {[item.listing?.brand, item.listing?.model].filter(Boolean).join(' · ')}
                                        </ThemedText>
                                    )}
                                </View>
                                <View
                                    style={{
                                        backgroundColor: colors.backgroundElement,
                                        borderRadius: 999,
                                        paddingHorizontal: Spacing.two,
                                        paddingVertical: 4,
                                    }}
                                >
                                    <ThemedText style={{ fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: colors.text }}>
                                        x{item.quantity}
                                    </ThemedText>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Reseñas — la pieza que faltaba */}
                    <View style={{ paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
                            {avgRating > 0 && <Ionicons name="star" size={16} color={colors.text} />}
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>
                                {avgRating > 0 ? `${avgRating.toFixed(2)} · ${reviews.length} ${reviews.length === 1 ? 'reseña' : 'reseñas'}` : 'Reseñas'}
                            </ThemedText>
                        </View>

                        {reviews.length === 0 ? (
                            <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>
                                Sé el primero en reseñar este paquete.
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

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

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
                    onPress={() => router.push(`/checkout/package/${pkg.id}?mode=cart` as any)}
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
                    onPress={() => router.push(`/checkout/package/${pkg.id}` as any)}
                    style={{ backgroundColor: colors.primary, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: Radius.lg }}
                >
                    <ThemedText style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 }}>Reservar</ThemedText>
                </Pressable>
            </View>
        </View>
    );
}