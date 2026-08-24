import { useCallback, useState } from 'react';
import { View, Image, useColorScheme, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getCartItems, chargeAndCreateCartOrder, type CartItem } from '@/services/cartService';
import { KushkiPaymentForm } from '@/components/payment/KushkiPaymentForm';

const SERVICE_FEE_RATE = 0.05;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDateRange(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]} – ${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]}`;
}
function daysBetween(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

export default function CartSummaryScreen() {
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useFocusEffect(
        useCallback(() => {
            getCartItems().then(setItems).finally(() => setLoading(false));
        }, [])
    );

    const subtotal = items.reduce((sum, item) => {
        if (!item.daily_price) return sum;
        return sum + item.daily_price * item.quantity * daysBetween(item.start_date, item.end_date);
    }, 0);
    const serviceFee = Math.ceil(subtotal * SERVICE_FEE_RATE);
    const total = subtotal + serviceFee;

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four, zIndex: 1 }} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (success) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
                <Ionicons name="checkmark-circle" size={48} color={colors.primary} style={{ marginBottom: Spacing.three }} />
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginBottom: Spacing.two, textAlign: 'center' }}>
                    ¡Reservas confirmadas!
                </ThemedText>
                <ThemedText style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing.five }}>
                    Tus {items.length} {items.length === 1 ? 'reserva fue creada' : 'reservas fueron creadas'} correctamente.
                </ThemedText>
                <ThemedText
                    onPress={() => router.replace('/(tabs)/reservations' as any)}
                    style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.primary }}
                >
                    Ver mis reservas
                </ThemedText>
            </SafeAreaView>
        );
    }

    if (items.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
                <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four }} />
                <ThemedText style={{ color: colors.textSecondary }}>Tu carrito está vacío.</ThemedText>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={{ padding: Spacing.four, flex: 1 }}>
                        <BackButton style={{ marginBottom: Spacing.three }} />
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginBottom: Spacing.four }}>
                            Confirmar {items.length === 1 ? 'reserva' : `${items.length} reservas`}
                        </ThemedText>

                        {items.map((item) => (
                            <View key={item.id} style={{ flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.three }}>
                                <View style={{ width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden' }}>
                                    {item.cover_image_url ? (
                                        <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    ) : (
                                        <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                                    )}
                                </View>
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                                        {item.title ?? 'Item'}
                                    </ThemedText>
                                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                        {formatDateRange(item.start_date, item.end_date)}
                                        {item.quantity > 1 ? ` · x${item.quantity}` : ''}
                                    </ThemedText>
                                </View>
                            </View>
                        ))}

                        <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two, marginTop: Spacing.two }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>Subtotal</ThemedText>
                                <ThemedText style={{ fontSize: 13.5, color: colors.text }}>${(subtotal / 100).toFixed(2)}</ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>Comisión de servicio (5%)</ThemedText>
                                <ThemedText style={{ fontSize: 13.5, color: colors.text }}>${(serviceFee / 100).toFixed(2)}</ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.two, marginTop: Spacing.one, borderTopWidth: 1, borderColor: colors.border }}>
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>Total</ThemedText>
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>${(total / 100).toFixed(2)}</ThemedText>
                            </View>
                        </View>

                        {error && (
                            <View style={{ marginTop: Spacing.three, backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2', borderRadius: Radius.lg, padding: Spacing.three }}>
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
                                    const result = await chargeAndCreateCartOrder(kushkiToken);
                                    setConfirming(false);

                                    if (result.error) {
                                        setError(result.error);
                                        return;
                                    }
                                    setSuccess(true);
                                }}
                            />
                            {confirming && (
                                <View style={{ marginTop: Spacing.two, alignItems: 'center' }}>
                                    <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary }}>Creando tus reservas...</ThemedText>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}