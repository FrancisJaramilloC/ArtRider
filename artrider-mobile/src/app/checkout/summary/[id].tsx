import { useEffect, useState } from 'react';
import { View, Image, Pressable, ActivityIndicator, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getListingById, type Listing } from '@/services/catalogService';
import { createBooking } from '@/services/bookingsService';

const SERVICE_FEE_RATE = 0.05;

export default function CheckoutSummaryScreen() {
    const { id, from, to } = useLocalSearchParams<{ id: string; from: string; to: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        getListingById(id).then((l) => {
            setListing(l);
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

    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    const subtotal = listing.daily_price * days;
    const serviceFee = Math.ceil(subtotal * SERVICE_FEE_RATE);
    const total = subtotal + serviceFee;

    async function handleConfirm() {
        if (!listing) return;
        setError(null);
        setConfirming(true);

        // Nota: la tokenización real de Kushki (item 019) va a interceptar
        // este flujo antes de llegar aquí — por ahora createBooking() se
        // llama directo, sin kushkiTicket, para validar el flujo completo.
        const result = await createBooking(id, from, to);
        setConfirming(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        router.replace({
            pathname: '/checkout/success/[id]',
            params: { id: result.bookingId!, listingTitle: listing.title ?? 'Equipo', from, to, total: String(total) },
        } as any);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: Spacing.four, flex: 1 }}>
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginBottom: Spacing.four }}>
                    Confirmar reserva
                </ThemedText>

                {/* Resumen del equipo */}
                <View style={{ flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.four }}>
                    <View style={{ width: 72, height: 72, borderRadius: Radius.md, overflow: 'hidden' }}>
                        {listing.cover_image_url ? (
                            <Image source={{ uri: listing.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                            <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                        )}
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <ThemedText numberOfLines={2} style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>
                            {listing.title}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 4 }}>
                            {from} → {to}
                        </ThemedText>
                    </View>
                </View>

                {/* Desglose de precio */}
                <View
                    style={{
                        backgroundColor: colors.backgroundElement,
                        borderRadius: Radius.lg,
                        padding: Spacing.three,
                        gap: Spacing.two,
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>
                            ${(listing.daily_price / 100).toFixed(2)} x {days} {days === 1 ? 'día' : 'días'}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 13.5, color: colors.text }}>${(subtotal / 100).toFixed(2)}</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>Comisión de servicio (5%)</ThemedText>
                        <ThemedText style={{ fontSize: 13.5, color: colors.text }}>${(serviceFee / 100).toFixed(2)}</ThemedText>
                    </View>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingTop: Spacing.two,
                            marginTop: Spacing.one,
                            borderTopWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>Total</ThemedText>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>
                            ${(total / 100).toFixed(2)}
                        </ThemedText>
                    </View>
                </View>

                {error && (
                    <View
                        style={{
                            marginTop: Spacing.three,
                            backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2',
                            borderRadius: Radius.lg,
                            padding: Spacing.three,
                        }}
                    >
                        <ThemedText style={{ color: colors.destructive, fontSize: 13.5 }}>{error}</ThemedText>
                    </View>
                )}
            </View>

            <View style={{ padding: Spacing.four, borderTopWidth: 1, borderColor: colors.border }}>
                <Pressable
                    onPress={handleConfirm}
                    disabled={confirming}
                    style={{
                        backgroundColor: confirming ? colors.backgroundSelected : colors.primary,
                        paddingVertical: Spacing.three,
                        borderRadius: Radius.lg,
                        alignItems: 'center',
                    }}
                >
                    {confirming ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' }}>
                            Confirmar y pagar
                        </ThemedText>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}