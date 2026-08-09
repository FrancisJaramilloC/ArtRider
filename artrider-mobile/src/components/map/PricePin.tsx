import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export function PricePin({ price, isSelected }: { price: number; isSelected: boolean }) {
  const label = `$${(price / 100).toFixed(0)}`;

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: isSelected ? Colors.light.primary : '#fff',
        transform: [{ scale: isSelected ? 1.15 : 1 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: isSelected ? '#fff' : '#111' }}>
        {label}
      </ThemedText>
    </View>
  );
}