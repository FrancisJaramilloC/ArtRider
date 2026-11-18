import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { CheckoutLoading, CheckoutShell, ErrorBanner, SummaryCard, SummaryItem } from '@/components/checkout/CheckoutParts';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { Text } from '@/components/ui/Text';
import { Spacing } from '@/constants/theme';
import { getPackageById, type PackageWithItems } from '@/services/packagesService';
import { chargeAndCreatePackageBooking } from '@/services/bookingsService';
import { KushkiPaymentForm } from '@/components/payment/KushkiPaymentForm';
import { usePricing } from '@/contexts/PricingContext';

export default function PackageCheckoutSummaryScreen() {
    const { id, from, to } = useLocalSearchParams<{ id: string; from: string; to: string }>();
    const router = useRouter();

    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { status, data: pkg, error: loadError, reload } = useAsyncData<PackageWithItems | null>(() => getPackageById(id), { enabled: !!id, deps: [id] });
    const { riderPrice, cartTotals } = usePricing();

    if (status === 'error') return <CheckoutShell title="Confirmar reserva"><ErrorState error={loadError} onRetry={reload} /></CheckoutShell>;
    if (status === 'loading' || !pkg) return <CheckoutLoading />;

    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    const riderDaily = riderPrice(pkg.daily_price);
    const { subtotal, serviceFee, total } = cartTotals(riderDaily * days);

    return (
        <CheckoutShell title="Confirmar reserva">
            <SummaryItem title={pkg.title} subtitle={`${from} → ${to}`} imageUri={pkg.cover_image_url} size={72} />

            <SummaryCard>
                <PriceSummary
                    lines={[
                        {
                            label: `$${(riderDaily / 100).toFixed(2)} x ${days} ${days === 1 ? 'día' : 'días'}`,
                            value: `$${(subtotal / 100).toFixed(2)}`,
                        },
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
                        const result = await chargeAndCreatePackageBooking(kushkiToken, id, from, to);
                        setConfirming(false);

                        if (result.error) {
                            setError(result.error);
                            return;
                        }

                        router.replace({
                            pathname: '/checkout/success/[id]',
                            params: { id: result.bookingId!, listingTitle: pkg.title, from, to, total: String(total) },
                        } as never);
                    }}
                />
                {confirming && (
                    <View style={{ marginTop: Spacing.two, alignItems: 'center' }}>
                        <Text variant="caption" color="textSecondary">
                            Creando tu reserva...
                        </Text>
                    </View>
                )}
            </View>
        </CheckoutShell>
    );
}
