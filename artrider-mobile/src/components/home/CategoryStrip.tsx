import { ScrollView } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { Chip } from '@/components/ui/Chip';
import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export function CategoryStrip({
    activeCategory,
    onSelect,
    gutter,
}: {
    activeCategory: string;
    onSelect: (id: string) => void;
    /** Margen lateral de pantalla (el scroll lo respeta pero las chips pueden llegar al borde). */
    gutter: number;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // flexGrow y flexShrink 0: el contenedor mide lo que miden las chips. Sin flexShrink 0, la lista de abajo
            // lo comprime (ScrollView trae flexShrink 1) y se recorta el borde inferior de las chips.
            style={{ flexGrow: 0, flexShrink: 0 }}
            contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: gutter, paddingBottom: Spacing.snug, alignItems: 'center' }}
        >
            {CATEGORIES.map(({ id, label, icon }) => (
                <Chip key={id} label={label} icon={icon as IconName} active={activeCategory === id} onPress={() => onSelect(id)} />
            ))}
        </ScrollView>
    );
}
