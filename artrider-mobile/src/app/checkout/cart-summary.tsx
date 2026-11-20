import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckoutLoading, CheckoutShell, ErrorBanner, SummaryCard, SummaryItem } from '@/components/checkout/CheckoutParts';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { Text } from '@/components/ui/Text';
import { COPY } from '@/constants/copy';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getCartItems, chargeAndCreateCartOrder, type CartItem } from '@/services/cartService';
import { KushkiPaymentForm } from '@/components/payment/KushkiPaymentForm';
import { formatShortDate } from '@/utils/format';
import { goToReservationsAfterPayment } from '@/utils/navigation';
import { usePricing } from '@/contexts/PricingContext';
import { usePriceChange } from '@/hooks/usePriceChange';

function formatDateRange(start: string, end: string): string {
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}
function daysBetween(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

export default function CartSummaryScreen() {
    const router = useRouter();
    const colors = useTheme();

    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paid, setPaid] = useState<{ items: CartItem[]; total: number } | null>(null);

    const { data, status, error: loadError, reload } = useAsyncData<CartItem[]>(getCartItems, { reloadOnFocus: true });
    const { riderPrice, cartTotals } = usePricing();
    const priceChange = usePriceChange();
    const items = data ?? [];

    const subtotalCents = items.reduce((sum, item) => {
        if (!item.daily_price) return sum;
        return sum + riderPrice(item.daily_price) * item.quantity * daysBetween(item.start_date, item.end_date);
    }, 0);
    const { subtotal, serviceFee, total } = priceChange.quote ?? cartTotals(subtotalCents);

    if (!paid && status === 'error') return <CheckoutShell title="Resumen del carrito"><ErrorState error={loadError} onRetry={reload} /></CheckoutShell>;
    if (!paid && status === 'loading') return <CheckoutLoading />;

    if (paid) {
        const count = paid.items.length;
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                {/* Compra ya pagada: la única salida es "Ver mis reservas". */}
                <Stack.Screen options={{ gestureEnabled: false, headerBackVisible: false }} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three }}>
                    <View style={{ width: 80, height: 80, borderRadius: Radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={40} color={colors.primary} />
                    </View>
                    <Text variant="title" style={{ textAlign: 'center' }} accessibilityRole="header">
                        {COPY.cartSuccessTitle(count)}
                    </Text>
                    <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
                        {COPY.cartSuccessNote(count)}
                    </Text>
                    <View style={{ alignSelf: 'stretch', backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.three, marginTop: Spacing.two }}>
                        {paid.items.map((item) => (
                            <View key={item.id} style={{ gap: Spacing.one }}>
                                <Text variant="subtitle" numberOfLines={2}>
                                    {item.title ?? 'Item'}
                                </Text>
                                <Text variant="caption" color="textSecondary">
                                    {formatDateRange(item.start_date, item.end_date)}
                                    {item.quantity > 1 ? ` · x${item.quantity}` : ''}
                                </Text>
                            </View>
                        ))}
                        <PriceSummary lines={[]} totalLabel="Total pagado" total={`$${(paid.total / 100).toFixed(2)}`} />
                    </View>
                </View>
                <StickyFooter>
                    <Button label="Ver mis reservas" onPress={() => goToReservationsAfterPayment(router)} />
                </StickyFooter>
            </SafeAreaView>
        );
    }

    if (items.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <ScreenHeader title="" />
                <EmptyState icon="cart-outline" title="Tu carrito está vacío." style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    return (
        <CheckoutShell title={`Confirmar ${items.length === 1 ? 'reserva' : `${items.length} reservas`}`}>
            <View style={{ gap: Spacing.three }}>
                {items.map((item) => (
                    <SummaryItem
                        key={item.id}
                        title={item.title ?? 'Item'}
                        subtitle={`${formatDateRange(item.start_date, item.end_date)}${item.quantity > 1 ? ` · x${item.quantity}` : ''}`}
                        imageUri={item.cover_image_url}
                        size={56}
                    />
                ))}
            </View>

            <SummaryCard>
                <PriceSummary
                    lines={[
                        { label: 'Subtotal', value: `$${(subtotal / 100).toFixed(2)}` },
                        { label: 'Tarifa de servicio', value: `$${(serviceFee / 100).toFixed(2)}` },
                    ]}
                    total={`$${(total / 100).toFixed(2)}`}
                />
            </SummaryCard>

            {error && <ErrorBanner message={error} />}

            <View>
                <KushkiPaymentForm
                    amount={total}
                    onError={(err) => setError(err)}
                    onSuccess={async (kushkiToken) => {
                        setError(null);
                        setConfirming(true);
                        const result = await chargeAndCreateCartOrder(kushkiToken, total);
                        setConfirming(false);

                        if (result.error) {
                            setError(priceChange.handle(result) ?? result.error);
                            return;
                        }
                        // Copia de los ítems antes de que el carrito se vacíe; el total es el que cobró el servidor.
                        setPaid({ items: [...items], total: result.total ?? total });
                    }}
                />
                {confirming && (
                    <View style={{ marginTop: Spacing.two, alignItems: 'center' }}>
                        <Text variant="caption" color="textSecondary">
                            Creando tus reservas...
                        </Text>
                    </View>
                )}
            </View>
        </CheckoutShell>
    );
}
