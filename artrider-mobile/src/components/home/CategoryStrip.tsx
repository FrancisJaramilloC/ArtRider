import { ScrollView, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';

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
            {CATEGORIES.map(({ id, label, icon }) => {
                const isActive = activeCategory === id;
                return (
                    <Pressable
                        key={id}
                        onPress={() => onSelect(id)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.one,
                            paddingHorizontal: Spacing.three,
                            paddingVertical: Spacing.two,
                            borderRadius: 999,
                            backgroundColor: isActive ? colors.primary : 'transparent',
                            borderWidth: isActive ? 0 : 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Ionicons name={icon as any} size={16} color={isActive ? '#fff' : colors.textSecondary} />
                        <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: isActive ? '#fff' : colors.textSecondary }}>
                            {label}
                        </ThemedText>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}