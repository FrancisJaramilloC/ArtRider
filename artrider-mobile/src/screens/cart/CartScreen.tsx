import { useCallback, useState } from 'react';
import { View, FlatList, Pressable, Image, useColorScheme, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getCartItems, removeFromCart, type CartItem } from '@/services/cartService';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDateRange(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]} – ${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]}`;
}

function daysBetween(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

export function CartScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();

    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            getCartItems()
                .then(setItems)
                .finally(() => setLoading(false));
        }, [])
    );

    async function handleRemove(id: string) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        await removeFromCart(id);
    }

    const subtotal = items.reduce((sum, item) => {
        if (!item.daily_price) return sum;
        return sum + item.daily_price * item.quantity * daysBetween(item.start_date, item.end_date);
    }, 0);
    const serviceFee = Math.ceil(subtotal * 0.05);
    const total = subtotal + serviceFee;

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two }}>
                <BackButton />
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text }}>
                    Carrito
                </ThemedText>
            </View>

            {items.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
                    <Ionicons name="cart-outline" size={40} color={colors.textSecondary} style={{ marginBottom: Spacing.three }} />
                    <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                        Tu carrito está vacío. Agrega equipos o paquetes desde su página de detalle.
                    </ThemedText>
                </View>
            ) : (
                <>
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}
                        renderItem={({ item }) => {
                            const days = daysBetween(item.start_date, item.end_date);
                            const itemTotal = item.daily_price ? (item.daily_price * item.quantity * days) / 100 : 0;
                            return (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        gap: Spacing.three,
                                        backgroundColor: colors.backgroundElement,
                                        borderRadius: Radius.lg,
                                        padding: Spacing.three,
                                    }}
                                >
                                    <View style={{ width: 64, height: 64, borderRadius: Radius.md, overflow: 'hidden' }}>
                                        {item.cover_image_url ? (
                                            <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        ) : (
                                            <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                                            {item.title ?? (item.item_type === 'package' ? 'Paquete' : 'Equipo')}
                                        </ThemedText>
                                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                            {formatDateRange(item.start_date, item.end_date)}
                                            {item.quantity > 1 ? ` · x${item.quantity}` : ''}
                                        </ThemedText>
                                        <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginTop: 4 }}>
                                            ${itemTotal.toFixed(2)}
                                        </ThemedText>
                                    </View>
                                    <Pressable onPress={() => handleRemove(item.id)} hitSlop={8} style={{ padding: 4 }}>
                                        <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                                    </Pressable>
                                </View>
                            );
                        }}
                    />

                    <View style={{ padding: Spacing.four, borderTopWidth: 1, borderColor: colors.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.one }}>
                            <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>Subtotal</ThemedText>
                            <ThemedText style={{ fontSize: 13.5, color: colors.text }}>${(subtotal / 100).toFixed(2)}</ThemedText>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.three }}>
                            <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>Comisión de servicio (5%)</ThemedText>
                            <ThemedText style={{ fontSize: 13.5, color: colors.text }}>${(serviceFee / 100).toFixed(2)}</ThemedText>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.four }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>Total</ThemedText>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>${(total / 100).toFixed(2)}</ThemedText>
                        </View>
                        <Pressable
                            onPress={() => router.push('/checkout/cart-summary' as any)}
                            style={{ backgroundColor: colors.primary, paddingVertical: Spacing.three, borderRadius: Radius.lg, alignItems: 'center' }}
                        >
                            <ThemedText style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 }}>Proceder al pago</ThemedText>
                        </Pressable>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}