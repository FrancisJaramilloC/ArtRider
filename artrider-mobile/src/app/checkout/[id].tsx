import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DateRangePicker, type DateRange } from '@/components/bookings/DateRangePicker';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getListingById, type Listing } from '@/services/catalogService';
import { getUnavailableDates, getAvailableUnitsCount } from '@/services/availabilityService';

export default function CheckoutRoute() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [listing, setListing] = useState<Listing | null>(null);
    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [range, setRange] = useState<DateRange>({ from: null, to: null });
    const [loading, setLoading] = useState(true);
    const [availableCount, setAvailableCount] = useState<number | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (!id) return;
        Promise.all([getListingById(id), getUnavailableDates(id)]).then(([l, dates]) => {
            setListing(l);
            setBlockedDates(dates);
            setLoading(false);
        });
    }, [id]);

    useEffect(() => {
        if (!id || !range.from || !range.to) {
            setAvailableCount(null);
            return;
        }
        setCheckingAvailability(true);
        getAvailableUnitsCount(id, range.from, range.to)
            .then((count) => {
                setAvailableCount(count);
                // Si la cantidad elegida ya no cabe en lo disponible, la recorta.
                setQuantity((q) => Math.min(q, Math.max(count, 1)));
            })
            .finally(() => setCheckingAvailability(false));
    }, [id, range.from, range.to]);

    if (loading || !listing) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four, zIndex: 1 }} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const maxQuantity = availableCount ?? 99;
    const canContinue = range.from && range.to && (availableCount === null || availableCount > 0) && quantity >= 1;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.four }}>
                <BackButton style={{ marginBottom: Spacing.three }} />
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginBottom: Spacing.one }}>
                    {listing.title}
                </ThemedText>
                <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginBottom: Spacing.four }}>
                    Selecciona las fechas de tu reserva
                </ThemedText>

                <DateRangePicker blockedDates={blockedDates} onChange={setRange} />

                {range.from && range.to && (
                    <>
                        <View
                            style={{
                                marginTop: Spacing.three,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: colors.backgroundElement,
                                borderRadius: Radius.md,
                                padding: Spacing.three,
                            }}
                        >
                            {checkingAvailability ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : availableCount !== null && availableCount === 0 ? (
                                <ThemedText style={{ fontSize: 13, color: colors.destructive }}>
                                    No hay unidades disponibles para esas fechas
                                </ThemedText>
                            ) : (
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>
                                    {availableCount} {availableCount === 1 ? 'unidad disponible' : 'unidades disponibles'} para esas fechas
                                </ThemedText>
                            )}
                        </View>

                        {availableCount !== null && availableCount > 0 && (
                            <View
                                style={{
                                    marginTop: Spacing.three,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: colors.backgroundElement,
                                    borderRadius: Radius.md,
                                    padding: Spacing.three,
                                }}
                            >
                                <ThemedText style={{ fontSize: 14, color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
                                    Cantidad a rentar
                                </ThemedText>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                                    <Pressable
                                        onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                                        disabled={quantity <= 1}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: colors.background,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: quantity <= 1 ? 0.4 : 1,
                                        }}
                                    >
                                        <Ionicons name="remove" size={16} color={colors.text} />
                                    </Pressable>
                                    <ThemedText style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.text, minWidth: 20, textAlign: 'center' }}>
                                        {quantity}
                                    </ThemedText>
                                    <Pressable
                                        onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                                        disabled={quantity >= maxQuantity}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: colors.background,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: quantity >= maxQuantity ? 0.4 : 1,
                                        }}
                                    >
                                        <Ionicons name="add" size={16} color={colors.text} />
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </>
                )}

                <View style={{ height: Spacing.six }} />
            </ScrollView>

            <View style={{ padding: Spacing.four, borderTopWidth: 1, borderColor: colors.border }}>
                <Pressable
                    disabled={!canContinue}
                    onPress={() => {
                        router.push({
                            pathname: '/checkout/summary/[id]',
                            params: { id: listing.id, from: range.from!, to: range.to!, quantity: String(quantity) },
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
                        {canContinue ? 'Continuar' : range.from && range.to ? 'Sin disponibilidad' : 'Selecciona tus fechas'}
                    </ThemedText>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}