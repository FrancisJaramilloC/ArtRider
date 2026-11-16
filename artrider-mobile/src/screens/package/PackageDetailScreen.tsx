import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailBottomBar, DetailSection, DetailSheet, MetaItem, MetaRow, ProviderRow, ReviewList } from '@/components/detail/DetailParts';
import { DetailHero } from '@/components/detail/DetailHero';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getPackageById, getPackageReviews, type PackageWithItems, type PackageReview } from '@/services/packagesService';
import { toggleFavorito, getUserFavIds } from '@/services/favoritosService';
import { findExistingConversation } from '@/services/messagesService';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/utils/format';

/** Espacio para que la barra inferior fija no tape el final del contenido. */
const BOTTOM_BAR_CLEARANCE = 112;

export function PackageDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colors = useTheme();
    const { session } = useAuth();
    const { insets } = useLayout();

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

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <Skeleton height={260} radius={0} />
                <View style={{ padding: Spacing.four, gap: Spacing.three }}>
                    <Skeleton width={90} height={24} radius={Radius.full} />
                    <Skeleton width="80%" height={28} />
                    <Skeleton height={64} radius={Radius.card} />
                    <Skeleton height={96} radius={Radius.card} />
                </View>
            </View>
        );
    }

    if (!pkg) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
                <EmptyState
                    icon="alert-circle-outline"
                    tone="error"
                    title="No encontramos este paquete"
                    description="Puede que ya no esté publicado."
                    actionLabel="Volver"
                    onAction={() => router.back()}
                />
            </SafeAreaView>
        );
    }

    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const images = [pkg.cover_image_url].filter((x): x is string => Boolean(x));

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BOTTOM_BAR_CLEARANCE + insets.bottom }}>
                <DetailHero images={images} esFavorito={esFavorito} onToggleFavorito={handleToggleFavorito} />

                <DetailSheet>
                    <View style={{ gap: Spacing.two, paddingBottom: Spacing.four }}>
                        <Badge label="Paquete" tone="accent" />
                        <Text variant="title">{pkg.title}</Text>
                        <MetaRow>
                            {avgRating > 0 && <MetaItem icon="star" strong label={`${avgRating.toFixed(2)} (${reviews.length})`} />}
                            {pkg.capacity_people != null && (
                                <MetaItem
                                    icon="people-outline"
                                    label={`Hasta ${pkg.capacity_people} ${pkg.capacity_people === 1 ? 'persona' : 'personas'}`}
                                />
                            )}
                        </MetaRow>
                    </View>

                    <DetailSection>
                        <ProviderRow brandName={pkg.provider?.brand_name} onPress={handleContactarProveedor} />
                    </DetailSection>

                    {pkg.description ? (
                        <DetailSection title="Sobre este paquete">
                            <Text variant="body" color="textSecondary">
                                {pkg.description}
                            </Text>
                        </DetailSection>
                    ) : null}

                    <DetailSection title="Equipos incluidos">
                        {pkg.items.map((item) => (
                            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                                <View style={{ width: 56, height: 56, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.backgroundElement }}>
                                    {item.listing?.cover_image_url ? (
                                        <Image
                                            source={{ uri: item.listing.cover_image_url }}
                                            style={{ width: 56, height: 56 }}
                                            contentFit="cover"
                                            transition={150}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="cube-outline" size={20} color={colors.textMuted} />
                                        </View>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text variant="bodyStrong" numberOfLines={2}>
                                        {item.listing?.title ?? 'Equipo no disponible'}
                                    </Text>
                                    {(item.listing?.brand || item.listing?.model) && (
                                        <Text variant="caption" color="textSecondary" numberOfLines={1}>
                                            {[item.listing?.brand, item.listing?.model].filter(Boolean).join(' · ')}
                                        </Text>
                                    )}
                                </View>
                                <Badge label={`x${item.quantity}`} tone="neutral" />
                            </View>
                        ))}
                    </DetailSection>

                    <ReviewList rating={avgRating} reviews={reviews} emptyText="Sé el primero en reseñar este paquete." />
                </DetailSheet>
            </ScrollView>

            <DetailBottomBar
                priceLabel={formatPrice(pkg.daily_price)}
                onChat={handleContactarProveedor}
                chatLoading={contacting}
                onAddToCart={() => router.push(`/checkout/package/${pkg.id}?mode=cart` as never)}
                onReserve={() => router.push(`/checkout/package/${pkg.id}` as never)}
            />
        </View>
    );
}
