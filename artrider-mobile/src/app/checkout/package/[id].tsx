import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DateRangePicker, type DateRange } from '@/components/bookings/DateRangePicker';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getPackageById, type PackageWithItems } from '@/services/packagesService';
import { getPackageUnavailableDates } from '@/services/availabilityService';

export default function PackageCheckoutRoute() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [pkg, setPkg] = useState<PackageWithItems | null>(null);
    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [range, setRange] = useState<DateRange>({ from: null, to: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        Promise.all([getPackageById(id), getPackageUnavailableDates(id)]).then(([p, dates]) => {
            setPkg(p);
            setBlockedDates(dates);
            setLoading(false);
        });
    }, [id]);

    if (loading || !pkg) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four, zIndex: 1 }} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const canContinue = range.from && range.to;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.four }}>
                <BackButton style={{ marginBottom: Spacing.three }} />
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginBottom: Spacing.one }}>
                    {pkg.title}
                </ThemedText>
                <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginBottom: Spacing.four }}>
                    Selecciona las fechas de tu reserva
                </ThemedText>

                {/*
                  Una fecha aparece bloqueada si CUALQUIER equipo del paquete
                  se queda sin stock suficiente ese día — todo o nada, igual
                  que create_package_booking() valida al confirmar.
                */}
                <DateRangePicker blockedDates={blockedDates} onChange={setRange} />

                <View style={{ height: Spacing.six }} />
            </ScrollView>

            <View style={{ padding: Spacing.four, borderTopWidth: 1, borderColor: colors.border }}>
                <Pressable
                    disabled={!canContinue}
                    onPress={() => {
                        router.push({
                            pathname: '/checkout/package/summary/[id]',
                            params: { id: pkg.id, from: range.from!, to: range.to! },
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