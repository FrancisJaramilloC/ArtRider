import { View, Pressable, Image, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_LABELS, CATEGORY_GRADIENTS } from '@/constants/categories';
import type { ExploreItem } from '@/services/exploreService';

export function ExploreCard({ item, width }: { item: ExploreItem; width: number }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();

    const catLabel = item.tipo === 'paquete' ? 'Paquete' : (CATEGORY_LABELS[item.category ?? ''] ?? item.category ?? 'Equipo');
    const gradient = CATEGORY_GRADIENTS[item.category ?? ''] ?? CATEGORY_GRADIENTS.other;
    const price = `$${(item.daily_price / 100).toFixed(0)}`;

    return (
        <Pressable onPress={() => router.push(item.href as any)} style={{ width }}>
            <View style={{ borderRadius: Radius.lg, overflow: 'hidden', aspectRatio: 4 / 3 }}>
                {item.cover_image_url ? (
                    <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <LinearGradient colors={gradient} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <ThemedText style={{ fontSize: 28, opacity: 0.4 }}>📦</ThemedText>
                    </LinearGradient>
                )}

                {item.tipo === 'paquete' && (
                    <View
                        style={{
                            position: 'absolute',
                            left: 8,
                            top: 8,
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                        }}
                    >
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: '#111' }}>Paquete</ThemedText>
                    </View>
                )}
            </View>

            <View style={{ paddingTop: Spacing.two }}>
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 3 }}>
                    {catLabel}
                </ThemedText>
                <ThemedText numberOfLines={2} style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.text }}>
                    {item.title}
                </ThemedText>
                {item.city && (
                    <ThemedText numberOfLines={1} style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                        {item.city}
                    </ThemedText>
                )}
                <ThemedText style={{ marginTop: 5, fontSize: 12, color: colors.textSecondary }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13.5, color: colors.text }}>{price}</ThemedText> /día
                </ThemedText>
            </View>
        </Pressable>
    );
}