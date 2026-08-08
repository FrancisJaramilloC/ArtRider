import { View, Pressable, Image, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_LABELS, CATEGORY_GRADIENTS } from '@/constants/categories';
import { useFavorito } from '@/hooks/useFavorito';
import type { HomeCardItem } from '@/services/homeService';

const CARD_WIDTH = 180;

export function HomeCard({ item, isFavorito }: { item: HomeCardItem; isFavorito: boolean }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();
    const { esFavorito, toggleFavorito } = useFavorito(item.id, item.tipo, isFavorito);

    const catLabel = CATEGORY_LABELS[item.category ?? ''] ?? item.category ?? 'Equipo';
    const gradient = CATEGORY_GRADIENTS[item.category ?? ''] ?? CATEGORY_GRADIENTS.other;
    const price = `$${(item.daily_price / 100).toFixed(0)}`;

    return (
        <Pressable onPress={() => router.push(item.href as any)} style={{ width: CARD_WIDTH }}>
            <View style={{ borderRadius: Radius.lg, overflow: 'hidden', aspectRatio: 20 / 15 }}>
                {item.cover_image_url ? (
                    <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <LinearGradient colors={gradient} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <ThemedText style={{ fontSize: 32, opacity: 0.4 }}>📦</ThemedText>
                    </LinearGradient>
                )}

                <Pressable
                    onPress={toggleFavorito}
                    hitSlop={8}
                    style={{ position: 'absolute', right: 8, top: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Ionicons name={esFavorito ? 'heart' : 'heart-outline'} size={20} color={esFavorito ? '#C026D3' : '#fff'} />
                </Pressable>
            </View>

            <View style={{ paddingTop: Spacing.two }}>
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 4 }}>
                    {catLabel}
                </ThemedText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.one }}>
                    <ThemedText
                        numberOfLines={2}
                        style={{ fontFamily: 'Inter_700Bold', fontSize: 13.5, color: colors.text, flex: 1 }}
                    >
                        {item.title}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Ionicons name="star" size={11} color={colors.text} />
                        <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.text }}>
                            {item.rating > 0 ? item.rating.toFixed(1) : 'Nuevo'}
                        </ThemedText>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                    <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                    <ThemedText numberOfLines={1} style={{ fontSize: 11.5, color: colors.textSecondary }}>
                        {item.city}
                    </ThemedText>
                </View>
                <ThemedText style={{ marginTop: 6, fontSize: 12.5, color: colors.textSecondary }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14.5, color: colors.text }}>{price}</ThemedText> por día
                </ThemedText>
            </View>
        </Pressable>
    );
}