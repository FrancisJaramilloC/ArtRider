import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DateRangePicker, type DateRange } from '@/components/booking/DateRangePicker';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getListingById, type Listing } from '@/services/catalogService';
import { getUnavailableDates } from '@/services/availabilityService';

export default function CheckoutRoute() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [listing, setListing] = useState<Listing | null>(null);
    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [range, setRange] = useState<DateRange>({ from: null, to: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        Promise.all([getListingById(id), getUnavailableDates(id)]).then(([l, dates]) => {
            setListing(l);
            setBlockedDates(dates);
            setLoading(false);
        });
    }, [id]);

    if (loading || !listing) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    const canContinue = range.from && range.to;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.four }}>
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginBottom: Spacing.one }}>
                    {listing.title}
                </ThemedText>
                <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginBottom: Spacing.four }}>
                    Selecciona las fechas de tu reserva
                </ThemedText>

                <DateRangePicker blockedDates={blockedDates} onChange={setRange} />

                <View style={{ height: Spacing.six }} />
            </ScrollView>

            <View style={{ padding: Spacing.four, borderTopWidth: 1, borderColor: colors.border }}>
                <Pressable
                    disabled={!canContinue}
                    onPress={() => {
                        // El desglose de precio y confirmación real es el item 017 —
                        // por ahora solo confirmamos que las fechas se pasan bien.
                        router.push({
                            pathname: '/checkout/summary/[id]',
                            params: { id: listing.id, from: range.from!, to: range.to! },
                        } as any);
                    }}
                    style={{
                        backgroundColor: canContinue ? colors.primary : colors.backgroundSelected,
                        paddingVertical: Spacing.three,
                        borderRadius: Radius.lg,
                        alignItems: 'center',
                    }}
                >
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: canContinue ? '#fff' : colors.textSecondary }}>
                        {canContinue ? 'Continuar' : 'Selecciona tus fechas'}
                    </ThemedText>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}