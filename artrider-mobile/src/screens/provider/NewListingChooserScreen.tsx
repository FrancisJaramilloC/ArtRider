import { View, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';

export function NewListingChooserScreen() {
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: Spacing.four }}>
                <BackButton style={{ marginBottom: Spacing.four }} />
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.text, marginBottom: Spacing.one }}>
                    ¿Qué quieres publicar?
                </ThemedText>
                <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.five }}>
                    Elige el tipo de anuncio que quieres crear.
                </ThemedText>

                <Pressable
                    onPress={() => router.push('/provider/create-listing' as any)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.three,
                        padding: Spacing.four,
                        borderRadius: Radius.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        marginBottom: Spacing.three,
                    }}
                >
                    <View style={{ width: 48, height: 48, borderRadius: Radius.lg, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="cube-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>
                            Equipo individual
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 2 }}>
                            Publica una pieza de equipo suelta, con su propia ubicación y stock.
                        </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                    onPress={() => router.push('/provider/create-package' as any)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.three,
                        padding: Spacing.four,
                        borderRadius: Radius.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <View style={{ width: 48, height: 48, borderRadius: Radius.lg, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="layers-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>
                            Paquete
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 2 }}>
                            Combina varios equipos que ya publicaste en un solo combo con precio propio.
                        </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </Pressable>
            </View>
        </SafeAreaView>
    );
}