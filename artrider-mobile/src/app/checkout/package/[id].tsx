import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateRangePicker, type DateRange } from '@/components/bookings/DateRangePicker';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getPackageById, type PackageWithItems } from '@/services/packagesService';
import { getPackageUnavailableDates } from '@/services/availabilityService';
import { addToCart } from '@/services/cartService';

export default function PackageCheckoutRoute() {
    const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
    const isCartMode = mode === 'cart';
    const router = useRouter();
    const colors = useTheme();
    const { gutter, contentWidth } = useLayout();

    const [range, setRange] = useState<DateRange>({ from: null, to: null });
    const [addingToCart, setAddingToCart] = useState(false);

    const { status, data: loaded, error, reload } = useAsyncData<{ pkg: PackageWithItems | null; blockedDates: string[] }>(
        async () => {
            const [pkg, blockedDates] = await Promise.all([getPackageById(id), getPackageUnavailableDates(id)]);
            return { pkg, blockedDates };
        },
        { enabled: !!id, deps: [id] },
    );
    const pkg = loaded?.pkg ?? null;
    const blockedDates = loaded?.blockedDates ?? [];
    const loading = status === 'loading';

    async function handleContinue() {
        if (!pkg || !range.from || !range.to) return;

        if (isCartMode) {
            setAddingToCart(true);
            await addToCart({
                itemType: 'package',
                packageId: pkg.id,
                startDate: range.from,
                endDate: range.to,
            });
            setAddingToCart(false);
            router.push('/cart' as never);
            return;
        }

        router.push({
            pathname: '/checkout/package/summary/[id]',
            params: { id: pkg.id, from: range.from, to: range.to },
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

    if (loading || !pkg) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <ScreenHeader title="" />
                <View style={{ padding: gutter, gap: Spacing.three }}>
                    <Skeleton width="70%" height={24} />
                    <Skeleton height={320} radius={Radius.card} />
                </View>
            </SafeAreaView>
        );
    }

    const canContinue = !!(range.from && range.to);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title={pkg.title} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: gutter, paddingBottom: Spacing.five, gap: Spacing.three, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
            >
                <Text variant="body" color="textSecondary">
                    {isCartMode ? 'Selecciona las fechas para agregar al carrito' : 'Selecciona las fechas de tu reserva'}
                </Text>

                <DateRangePicker blockedDates={blockedDates} onChange={setRange} />
            </ScrollView>

            <StickyFooter>
                <Button
                    label={!canContinue ? 'Selecciona tus fechas' : isCartMode ? 'Agregar al carrito' : 'Continuar'}
                    onPress={handleContinue}
                    disabled={!canContinue}
                    loading={addingToCart}
                />
            </StickyFooter>
        </SafeAreaView>
    );
}
