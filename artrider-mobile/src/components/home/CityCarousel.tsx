import { View, ScrollView, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { HomeCard } from './HomeCard';
import type { HomeCardItem } from '@/services/homeService';
export function CityCarousel({
    title,
    subtitle,
    items,
    favoriteIds,
    onSeeMore,
}: {
    title: string;
    subtitle?: string;
    items: HomeCardItem[];
    favoriteIds: Set<string>;
    onSeeMore?: () => void;
}) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    if (items.length === 0) return null;

    const Header = (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.four, marginBottom: Spacing.three }}>
            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 19, color: colors.text }}>{title}</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </View>
    );

    return (
        <View style={{ paddingTop: Spacing.four }}>
            {onSeeMore ? <Pressable onPress={onSeeMore}>{Header}</Pressable> : Header}
            {subtitle && (
                <ThemedText style={{ fontSize: 13, color: colors.textSecondary, paddingHorizontal: Spacing.four, marginTop: -8, marginBottom: Spacing.two }}>
                    {subtitle}
                </ThemedText>
            )}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}
            >
                {items.map((item) => (
                    <HomeCard key={item.id} item={item} isFavorito={favoriteIds.has(item.id)} />
                ))}
            </ScrollView>
        </View>
    );
}