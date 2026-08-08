import { ScrollView, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';

export function CategoryStrip() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three }}
        >
            {CATEGORIES.map(({ id, label, icon }, i) => {
                const isFirst = i === 0;
                return (
                    <Pressable
                        key={id}
                        onPress={() => router.push(id === 'all' ? '/explore' : (`/explore?category=${id}` as any))}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.one,
                            paddingHorizontal: Spacing.three,
                            paddingVertical: Spacing.two,
                            borderRadius: 999,
                            backgroundColor: isFirst ? colors.primary : 'transparent',
                            borderWidth: isFirst ? 0 : 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Ionicons name={icon as any} size={16} color={isFirst ? '#fff' : colors.textSecondary} />
                        <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: isFirst ? '#fff' : colors.textSecondary }}>
                            {label}
                        </ThemedText>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}