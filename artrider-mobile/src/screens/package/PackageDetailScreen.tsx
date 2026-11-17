import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { DetailSection, ExpandableText, ItemCarousel, MetaItem, MetaRow, ProviderRow, ReviewList } from '@/components/detail/DetailParts';
import { DetailCartFooter } from '@/components/detail/DetailCartFooter';
import { DetailMessage, DetailScaffold, DetailSkeleton } from '@/components/detail/DetailScaffold';
import { Badge } from '@/components/ui/Badge';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Text } from '@/components/ui/Text';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getPackageById, getPackageReviews, type PackageWithItems, type PackageReview } from '@/services/packagesService';
import { toggleFavorito, getUserFavIds } from '@/services/favoritosService';
import { findExistingConversation } from '@/services/messagesService';
import { loadRelatedListings } from '@/screens/listing/relatedListings';
import { emitFavoriteChange, onFavoriteChange } from '@/utils/favoritesSync';
import { useAuth } from '@/hooks/useAuth';

type PackageBundle = { pkg: PackageWithItems | null; reviews: PackageReview[]; fav: boolean };

export function PackageDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colors = useTheme();
    const { session } = useAuth();

    const [esFavorito, setEsFavorito] = useState(false);

    const { status, data: bundle, error, reload } = useAsyncData<PackageBundle>(
        async () => {
            const pkg = await getPackageById(id);
            if (!pkg) return { pkg: null, reviews: [], fav: false };
            const [reviews, favIds] = await Promise.all([
                getPackageReviews(pkg.id).catch(() => [] as PackageReview[]),
                session?.user ? getUserFavIds().catch(() => null) : Promise.resolve(null),
            ]);
            return { pkg, reviews, fav: favIds?.paqueteIds.includes(id) ?? false };
        },
        { enabled: !!id, deps: [id, session] },
    );
    const pkg = bundle?.pkg ?? null;
    const reviews = bundle?.reviews ?? [];

    // Secundario y no bloqueante: más equipos del mismo proveedor.
    const { data: related } = useAsyncData(
        () => (pkg ? loadRelatedListings(pkg.provider_id, null, null).catch(() => null) : Promise.resolve(null)),
        { enabled: !!pkg, deps: [pkg?.id] },
    );

    useEffect(() => {
        if (bundle) setEsFavorito(bundle.fav);
    }, [bundle]);

    // Si se cambia el favorito desde otro lado (lista de Favoritos, tarjetas), el corazón se actualiza sin recargar.
    useEffect(
        () =>
            onFavoriteChange((c) => {
                if (c.tipo === 'paquete' && c.id === id) setEsFavorito(c.esFavorito);
            }),
        [id],
    );

    async function handleToggleFavorito() {
        if (!pkg) return;
        setEsFavorito((prev) => !prev);
        const result = await toggleFavorito(pkg.id, 'paquete');
        if (!result.error) {
            setEsFavorito(result.esFavorito);
            emitFavoriteChange({ id: pkg.id, tipo: 'paquete', esFavorito: result.esFavorito });
        }
    }

    async function handleContactarProveedor() {
        if (!pkg) return;
        if (!session?.user) {
            router.push('/login');
            return;
        }
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
        }
    }

    if (status === 'loading') return <DetailSkeleton />;
    if (status === 'error') return <DetailMessage kind="error" error={error} onRetry={reload} />;
    if (!pkg) return <DetailMessage kind="not-found" title="No encontramos este paquete" onBack={() => router.back()} />;

    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const images = [pkg.cover_image_url].filter((x): x is string => Boolean(x));

    return (
        <DetailScaffold
            title={pkg.title}
            images={images}
            esFavorito={esFavorito}
            onToggleFavorito={handleToggleFavorito}
            footer={<DetailCartFooter kind="package" id={pkg.id} title={pkg.title} dailyPrice={pkg.daily_price} providerId={pkg.provider_id} />}
        >
            <View style={{ gap: Rhythm.titleToContent }}>
                <Badge label="Paquete" tone="accent" />
                <Text variant="title">{pkg.title}</Text>
                <MetaRow>
                    {avgRating > 0 && <MetaItem icon="star" strong label={`${avgRating.toFixed(2)} (${reviews.length})`} />}
                    {pkg.city ? <MetaItem icon="location-outline" label={pkg.city} /> : null}
                    {pkg.capacity_people != null && (
                        <MetaItem icon="people-outline" label={`Hasta ${pkg.capacity_people} ${pkg.capacity_people === 1 ? 'persona' : 'personas'}`} />
                    )}
                </MetaRow>
            </View>

            <DetailSection divider>
                <ProviderRow brandName={pkg.provider?.brand_name} onPress={handleContactarProveedor} />
            </DetailSection>

            <DetailSection title="Qué incluye">
                {pkg.items.map((item) => (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                        <View style={{ width: 56, height: 56, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.imageBackdrop, borderWidth: 1, borderColor: colors.border }}>
                            {item.listing?.cover_image_url ? (
                                <Image source={{ uri: item.listing.cover_image_url }} style={{ width: 56, height: 56 }} contentFit="contain" transition={150} cachePolicy="memory-disk" />
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
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

            {pkg.description ? (
                <DetailSection title="Descripción">
                    <ExpandableText text={pkg.description} />
                </DetailSection>
            ) : null}

            <ReviewList rating={avgRating} reviews={reviews} emptyText="Sé el primero en reseñar este paquete." />

            {related?.fromProvider.length ? (
                <DetailSection title="Más de este proveedor" divider>
                    <ItemCarousel items={related.fromProvider} favoriteIds={related.favoriteIds} />
                </DetailSection>
            ) : null}
        </DetailScaffold>
    );
}
