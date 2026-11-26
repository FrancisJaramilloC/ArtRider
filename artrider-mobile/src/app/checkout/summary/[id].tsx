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
import { Button } from '@/components/ui/Button';
import { COPY } from '@/constants/copy';
import { usePricing } from '@/contexts/PricingContext';
import { usePaymentGuard } from '@/hooks/usePaymentGuard';
import { usePriceChange } from '@/hooks/usePriceChange';
import { formatChargeError } from '@/services/chargeService';
import { goToReservationsAfterPayment } from '@/utils/navigation';

export default function CheckoutSummaryScreen() {
    const { id, from, to, quantity: quantityParam } = useLocalSearchParams<{ id: string; from: string; to: string; quantity?: string }>();
    const router = useRouter();
    const quantity = Number(quantityParam ?? '1') || 1;

    const guard = usePaymentGuard();
    const [error, setError] = useState<string | null>(null);

    const { status, data: listing, error: loadError, reload } = useAsyncData<Listing | null>(() => getListingById(id), { enabled: !!id, deps: [id] });
    const { riderPrice, cartTotals } = usePricing();
    const priceChange = usePriceChange();

    if (status === 'error') return <CheckoutShell title="Confirmar reserva"><ErrorState error={loadError} onRetry={reload} /></CheckoutShell>;
    if (status === 'loading' || !listing) return <CheckoutLoading />;

    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    const riderDaily = riderPrice(listing.daily_price);
    const { subtotal, serviceFee, total } = priceChange.quote ?? cartTotals(riderDaily * days * quantity);

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
                            label: `$${(riderDaily / 100).toFixed(2)} x ${days} ${days === 1 ? 'día' : 'días'}${quantity > 1 ? ` x ${quantity}` : ''}`,
                            value: `$${(subtotal / 100).toFixed(2)}`,
                        },
                        { label: 'Tarifa de servicio', value: `$${(serviceFee / 100).toFixed(2)}` },
                    ]}
                    total={`$${(total / 100).toFixed(2)}`}
                />
            </SummaryCard>

            {(error ?? (guard.locked ? COPY.paymentUncertain : null)) && <ErrorBanner message={error ?? COPY.paymentUncertain} />}

            <View>
                {guard.locked ? (
                    // Cobro incierto: no se puede volver a pagar aquí; se desbloquea al salir de la pantalla.
                    <Button label={COPY.paymentSeeReservations} onPress={() => goToReservationsAfterPayment(router)} />
                ) : (
                    <KushkiPaymentForm
                        amount={total}
                        disabled={guard.inFlight}
                        onError={(err) => setError(err)}
                        onSuccess={async (kushkiToken) => {
                            const result = await guard.run(() => {
                                setError(null);
                                return chargeAndCreateBooking(kushkiToken, id, from, to, quantity, total);
                            });
                            if (!result) return;

                            if (result.error) {
                                setError(priceChange.handle(result) ?? formatChargeError(result));
                                return;
                            }

                            router.replace({
                                pathname: '/checkout/success/[id]',
                                params: { id: result.bookingId!, listingTitle: listing.title ?? 'Equipo', from, to, total: String(result.total ?? total) },
                            } as never);
                        }}
                    />
                )}
                {guard.inFlight && (
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
