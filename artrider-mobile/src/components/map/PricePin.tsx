import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function PricePin({ price, isSelected }: { price: number; isSelected: boolean }) {
  const colors = useTheme();
  const label = `$${(price / 100).toFixed(0)}`;

  return (
    <View
      style={{
        paddingHorizontal: Spacing.snug,
        paddingVertical: Spacing.two,
        borderRadius: 999,
        backgroundColor: isSelected ? colors.primary : colors.background,
        transform: [{ scale: isSelected ? 1.15 : 1 }],
        ...Shadows.floating,
      }}
    >
      <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: isSelected ? colors.onPrimary : colors.text }}>
        {label}
      </ThemedText>
    </View>
  );
}