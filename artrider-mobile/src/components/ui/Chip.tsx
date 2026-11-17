import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/utils/haptics';
import { Text } from './Text';

/** Alto = objetivo táctil mínimo: sin hitSlop ni recortes. */
const CHIP_HEIGHT = MinTouch;

export type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

/** Píldora de filtro/categoría: acento sólido cuando está activa, borde sutil si no. */
export function Chip({ label, active = false, onPress, icon, style }: ChipProps) {
  const colors = useTheme();
  const fg = active ? colors.onPrimary : colors.textSecondary;

  return (
    <Pressable
      testID="chip"
      onPress={() => {
        hapticSelect();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          height: CHIP_HEIGHT,
          borderRadius: Radius.full,
          paddingHorizontal: Spacing.three,
          backgroundColor: active ? colors.primary : colors.background,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.border,
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
        <Text variant="captionStrong" maxFontSizeMultiplier={1.2} style={{ color: fg }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
