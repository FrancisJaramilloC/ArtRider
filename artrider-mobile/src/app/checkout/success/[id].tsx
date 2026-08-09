import { View, Pressable, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function CheckoutSuccessScreen() {
    const { id, listingTitle, from, to, total } = useLocalSearchParams<{
        id: string;
        listingTitle: string;
        from: string;
        to: string;
        total: string;
    }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five }}>
                <View
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: '#dcfce7',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: Spacing.five,
                    }}
                >
                    <Ionicons name="checkmark" size={40} color="#166534" />
                </View>

                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text, textAlign: 'center', marginBottom: Spacing.two }}>
                    ¡Solicitud enviada!
                </ThemedText>
                <ThemedText style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing.five }}>
                    El proveedor revisará tu solicitud y la confirmará pronto.
                </ThemedText>

                <View
                    style={{
                        width: '100%',
                        backgroundColor: colors.backgroundElement,
                        borderRadius: Radius.lg,
                        padding: Spacing.four,
                        gap: Spacing.two,
                    }}
                >
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>{listingTitle}</ThemedText>
                    <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{from} → {to}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Reserva #{id.slice(0, 8)}</ThemedText>
                    <View style={{ borderTopWidth: 1, borderColor: colors.border, marginTop: Spacing.two, paddingTop: Spacing.two }}>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>
                            Total pagado: ${(Number(total) / 100).toFixed(2)}
                        </ThemedText>
                    </View>
                </View>
            </View>

            <View style={{ padding: Spacing.four }}>
                <Pressable
                    onPress={() => router.replace('/(tabs)/reservations')}
                    style={{ backgroundColor: colors.primary, paddingVertical: Spacing.three, borderRadius: Radius.lg, alignItems: 'center' }}
                >
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' }}>Ver mis reservas</ThemedText>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}