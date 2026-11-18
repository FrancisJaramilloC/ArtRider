import { View, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getCartItems, removeFromCart, type CartItem } from '@/services/cartService';
import { formatShortDate } from '@/utils/format';
import { usePricing } from '@/contexts/PricingContext';

function formatDateRange(start: string, end: string): string {
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function daysBetween(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

export function CartScreen() {
    const colors = useTheme();
    const router = useRouter();
    const { gutter, insets, contentWidth } = useLayout();

    const { data, status, error, refreshError, reload, setData } = useAsyncData<CartItem[]>(getCartItems, { reloadOnFocus: true });
    const { riderPrice, cartTotals } = usePricing();
    const items = data ?? [];
    const loading = status === 'loading';

    async function handleRemove(id: string) {
        setData((prev) => (prev ?? []).filter((i) => i.id !== id));
        await removeFromCart(id);
    }

    // `daily_price` es el precio del Partner: se muestra el precio del Rider y el redondeo .99 se aplica una sola vez al total.
    const subtotalCents = items.reduce((sum, item) => {
        if (!item.daily_price) return sum;
        return sum + riderPrice(item.daily_price) * item.quantity * daysBetween(item.start_date, item.end_date);
    }, 0);
    const { subtotal, serviceFee, total } = cartTotals(subtotalCents);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <ScreenHeader title="Carrito" />

            {status === 'error' ? (
                <ErrorState fill error={error} onRetry={reload} />
            ) : loading ? (
                <View style={{ padding: gutter, gap: Spacing.three }}>
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} height={96} radius={Radius.card} />
                    ))}
                </View>
            ) : items.length === 0 ? (
                <EmptyState
                    icon="cart-outline"
                    title="Tu carrito está vacío"
                    description="Tu carrito está vacío. Agrega equipos o paquetes desde su página de detalle."
                    actionLabel="Explorar equipos"
                    // Siempre al Home (pestaña principal): back() volvía al último equipo visto.
                    onAction={() => router.replace('/(tabs)')}
                    style={{ flex: 1 }}
                />
            ) : (
                <>
                    <FlatList
                        ListHeaderComponent={refreshError ? <RefreshErrorNotice error={refreshError} onRetry={reload} /> : undefined}
                        data={items}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: gutter, gap: Spacing.three, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
                        renderItem={({ item }) => {
                            const days = daysBetween(item.start_date, item.end_date);
                            const itemTotal = item.daily_price ? (riderPrice(item.daily_price) * item.quantity * days) / 100 : 0;
                            return (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: Spacing.three,
                                        backgroundColor: colors.backgroundElement,
                                        borderRadius: Radius.card,
                                        padding: Spacing.three,
                                    }}
                                >
                                    <View style={{ width: 72, height: 72, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
                                        {item.cover_image_url ? (
                                            <Image
                                                source={{ uri: item.cover_image_url }}
                                                style={{ width: 72, height: 72 }}
                                                contentFit="cover"
                                                transition={150}
                                                cachePolicy="memory-disk"
                                            />
                                        ) : (
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ flex: 1, gap: Spacing.half }}>
                                        <Text variant="bodyStrong" numberOfLines={2}>
                                            {item.title ?? (item.item_type === 'package' ? 'Paquete' : 'Equipo')}
                                        </Text>
                                        <Text variant="caption" color="textSecondary">
                                            {formatDateRange(item.start_date, item.end_date)}
                                            {item.quantity > 1 ? ` · x${item.quantity}` : ''}
                                        </Text>
                                        <Text variant="bodyStrong">${itemTotal.toFixed(2)}</Text>
                                    </View>
                                    <IconButton icon="trash-outline" label="Quitar del carrito" onPress={() => handleRemove(item.id)} variant="surface" />
                                </View>
                            );
                        }}
                    />

                    <View
                        style={{
                            paddingHorizontal: gutter,
                            paddingTop: Spacing.three,
                            paddingBottom: Math.max(insets.bottom, Spacing.three),
                            gap: Spacing.three,
                            borderTopWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                        }}
                    >
                        <PriceSummary
                            lines={[
                                { label: 'Subtotal', value: `$${(subtotal / 100).toFixed(2)}` },
                                { label: 'Tarifa de servicio', value: `$${(serviceFee / 100).toFixed(2)}` },
                            ]}
                            total={`$${(total / 100).toFixed(2)}`}
                        />
                        <Button label="Proceder al pago" onPress={() => router.push('/checkout/cart-summary' as never)} />
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}
