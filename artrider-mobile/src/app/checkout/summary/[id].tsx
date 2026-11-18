import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { CheckoutLoading, CheckoutShell, ErrorBanner, SummaryCard, SummaryItem } from '@/components/checkout/CheckoutParts';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { Text } from '@/components/ui/Text';
import { Spacing } from '@/constants/theme';
import { getListingById, type Listing } from '@/services/catalogService';
import { chargeAndCreateBooking } from '@/services/bookingsService';
import { KushkiPaymentForm } from '@/components/payment/KushkiPaymentForm';
import { computeServiceFee } from '@/utils/pricing';

export default function CheckoutSummaryScreen() {
    const { id, from, to, quantity: quantityParam } = useLocalSearchParams<{ id: string; from: string; to: string; quantity?: string }>();
    const router = useRouter();
    const quantity = Number(quantityParam ?? '1') || 1;

    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { status, data: listing, error: loadError, reload } = useAsyncData<Listing | null>(() => getListingById(id), { enabled: !!id, deps: [id] });

    if (status === 'error') return <CheckoutShell title="Confirmar reserva"><ErrorState error={loadError} onRetry={reload} /></CheckoutShell>;
    if (status === 'loading' || !listing) return <CheckoutLoading />;

    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    const subtotal = listing.daily_price * days * quantity;
    const serviceFee = computeServiceFee(subtotal);
    const total = subtotal + serviceFee;

    return (
        <CheckoutShell title="Confirmar reserva">
            <SummaryItem
                title={listing.title ?? 'Equipo'}
                subtitle={`${from} → ${to}`}
                extra={quantity > 1 ? `${quantity} unidades` : undefined}
                imageUri={listing.cover_image_url}
                size={72}
            />

            <SummaryCard>
                <PriceSummary
                    lines={[
                        {
                            label: `$${(listing.daily_price / 100).toFixed(2)} x ${days} ${days === 1 ? 'día' : 'días'}${quantity > 1 ? ` x ${quantity}` : ''}`,
                            value: `$${(subtotal / 100).toFixed(2)}`,
                        },
                        { label: 'Comisión de servicio (5%)', value: `$${(serviceFee / 100).toFixed(2)}` },
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
                        const result = await chargeAndCreateBooking(kushkiToken, id, from, to, quantity);
                        setConfirming(false);

                        if (result.error) {
                            setError(result.error);
                            return;
                        }

                        router.replace({
                            pathname: '/checkout/success/[id]',
                            params: { id: result.bookingId!, listingTitle: listing.title ?? 'Equipo', from, to, total: String(total) },
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
