import { ScrollView } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import { FilterChip } from '@/components/ui/FilterChip';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function CategoryStrip({
    activeCategory,
    onSelect,
}: {
    activeCategory: string;
    onSelect: (id: string) => void;
}) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three }}
        >
            {CATEGORIES.map(({ id, label, icon }) => (
                <FilterChip
                    key={id}
                    label={label}
                    icon={icon as any}
                    active={activeCategory === id}
                    onPress={() => onSelect(id)}
                    colors={colors}
                />
            ))}
        </ScrollView>
    );
}
