import { FlatList, View } from 'react-native';

import { ItemCard } from '@/components/ui/ItemCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
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
    const { gutter, carouselCardWidth } = useLayout();
    if (items.length === 0) return null;

    return (
        <View style={{ paddingTop: Spacing.four, gap: Spacing.three }}>
            <SectionHeader
                title={title}
                subtitle={subtitle}
                actionLabel={onSeeMore ? 'Ver más' : undefined}
                onActionPress={onSeeMore}
                style={{ paddingHorizontal: gutter }}
            />
            <FlatList
                horizontal
                data={items}
                keyExtractor={(item) => `${item.tipo}-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: gutter }}
                renderItem={({ item }) => <ItemCard item={item} width={carouselCardWidth} isFavorito={favoriteIds.has(item.id)} />}
            />
        </View>
    );
}
