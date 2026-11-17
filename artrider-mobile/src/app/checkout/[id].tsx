import { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateRangePicker, type DateRange } from '@/components/bookings/DateRangePicker';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getListingById, type Listing } from '@/services/catalogService';
import { getUnavailableDates, getAvailableUnitsCount } from '@/services/availabilityService';
import { addToCart } from '@/services/cartService';

export default function CheckoutRoute() {
    const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
    const isCartMode = mode === 'cart';
    const router = useRouter();
    const colors = useTheme();
    const { gutter, contentWidth } = useLayout();

    const [range, setRange] = useState<DateRange>({ from: null, to: null });
    const [availableCount, setAvailableCount] = useState<number | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);

    const { status, data: loaded, error, reload } = useAsyncData<{ listing: Listing | null; blockedDates: string[] }>(
        async () => {
            const [listing, blockedDates] = await Promise.all([getListingById(id), getUnavailableDates(id)]);
            return { listing, blockedDates };
        },
        { enabled: !!id, deps: [id] },
    );
    const listing = loaded?.listing ?? null;
    const blockedDates = loaded?.blockedDates ?? [];
    const loading = status === 'loading';

    useEffect(() => {
        if (!id || !range.from || !range.to) {
            setAvailableCount(null);
            return;
        }
        setCheckingAvailability(true);
        getAvailableUnitsCount(id, range.from, range.to)
            .then((count) => {
                setAvailableCount(count);
                setQuantity((q) => Math.min(q, Math.max(count, 1)));
            })
            .finally(() => setCheckingAvailability(false));
    }, [id, range.from, range.to]);

    async function handleContinue() {
        if (!listing || !range.from || !range.to) return;

        if (isCartMode) {
            setAddingToCart(true);
            await addToCart({
                itemType: 'listing',
                listingId: listing.id,
                startDate: range.from,
                endDate: range.to,
                quantity,
            });
            setAddingToCart(false);
            router.push('/cart' as never);
            return;
        }

        router.push({
            pathname: '/checkout/summary/[id]',
            params: { id: listing.id, from: range.from, to: range.to, quantity: String(quantity) },
        } as never);
    }

    if (status === 'error') {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <ScreenHeader title="Reservar" />
                <ErrorState fill error={error} onRetry={reload} />
            </SafeAreaView>
        );
    }

    if (loading || !listing) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <ScreenHeader title="" />
                <View style={{ padding: gutter, gap: Spacing.three }}>
                    <Skeleton width="70%" height={24} />
                    <Skeleton width="50%" height={16} />
                    <Skeleton height={320} radius={Radius.card} />
                </View>
            </SafeAreaView>
        );
    }

    const maxQuantity = availableCount ?? 99;
    const canContinue = range.from && range.to && (availableCount === null || availableCount > 0) && quantity >= 1;
    const hasRange = !!(range.from && range.to);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title={listing.title ?? 'Reservar'} />
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: gutter, paddingBottom: Spacing.five, gap: Spacing.three, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
            >
                <Text variant="body" color="textSecondary">
                    {isCartMode ? 'Selecciona las fechas para agregar al carrito' : 'Selecciona las fechas de tu reserva'}
                </Text>

                <DateRangePicker blockedDates={blockedDates} onChange={setRange} />

                {hasRange && (
                    <>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: Spacing.two,
                                backgroundColor: colors.backgroundElement,
                                borderRadius: Radius.xl,
                                padding: Spacing.three,
                                minHeight: 52,
                            }}
                        >
                            {checkingAvailability ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : availableCount !== null && availableCount === 0 ? (
                                <Text variant="body" color="destructive">
                                    No hay unidades disponibles para esas fechas
                                </Text>
                            ) : (
                                <Text variant="body" color="textSecondary">
                                    {availableCount} {availableCount === 1 ? 'unidad disponible' : 'unidades disponibles'} para esas fechas
                                </Text>
                            )}
                        </View>

                        {availableCount !== null && availableCount > 0 && (
                            <QuantityStepper label="Cantidad a rentar" value={quantity} max={maxQuantity} onChange={setQuantity} />
                        )}
                    </>
                )}
            </ScrollView>

            <StickyFooter>
                <Button
                    label={
                        !canContinue
                            ? hasRange
                                ? 'Sin disponibilidad'
                                : 'Selecciona tus fechas'
                            : isCartMode
                              ? 'Agregar al carrito'
                              : 'Continuar'
                    }
                    onPress={handleContinue}
                    disabled={!canContinue}
                    loading={addingToCart}
                />
            </StickyFooter>
        </SafeAreaView>
    );
}
