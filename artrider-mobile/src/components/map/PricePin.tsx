import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/utils/format';

export function PricePin({ price, isSelected }: { price: number; isSelected: boolean }) {
  const colors = useTheme();
  // `price` ya es el precio del Rider (centavos). formatPrice muestra decimales solo si hacen falta.
  const label = formatPrice(price);

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