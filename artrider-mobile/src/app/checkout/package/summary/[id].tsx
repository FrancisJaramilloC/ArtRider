import { useEffect, useState } from 'react';
import { View, Image, useColorScheme, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getPackageById, type PackageWithItems } from '@/services/packagesService';
import { chargeAndCreatePackageBooking } from '@/services/bookingsService';
import { KushkiPaymentForm } from '@/components/payment/KushkiPaymentForm';

const SERVICE_FEE_RATE = 0.05;

export default function PackageCheckoutSummaryScreen() {
    const { id, from, to } = useLocalSearchParams<{ id: string; from: string; to: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [pkg, setPkg] = useState<PackageWithItems | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        getPackageById(id).then((p) => {
            setPkg(p);
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

    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    const subtotal = pkg.daily_price * days;
    const serviceFee = Math.ceil(subtotal * SERVICE_FEE_RATE);
    const total = subtotal + serviceFee;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={{ padding: Spacing.four, flex: 1 }}>
                        <BackButton style={{ marginBottom: Spacing.three }} />
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginBottom: Spacing.four }}>
                            Confirmar reserva
                        </ThemedText>

                        <View style={{ flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.four }}>
                            <View style={{ width: 72, height: 72, borderRadius: Radius.md, overflow: 'hidden' }}>
                                {pkg.cover_image_url ? (
                                    <Image source={{ uri: pkg.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                ) : (
                                    <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                                )}
                            </View>
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <ThemedText numberOfLines={2} style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>
                                    {pkg.title}
                                </ThemedText>
                                <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 4 }}>
                                    {from} → {to}
                                </ThemedText>
                            </View>
                        </View>

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
                                    ${(pkg.daily_price / 100).toFixed(2)} x {days} {days === 1 ? 'día' : 'días'}
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

                        <View style={{ marginTop: Spacing.four }}>
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
                                    } as any);
                                }}
                            />
                            {confirming && (
                                <View style={{ marginTop: Spacing.two, alignItems: 'center' }}>
                                    <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary }}>Creando tu reserva...</ThemedText>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}