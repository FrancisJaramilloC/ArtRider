import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

const CHIP_HEIGHT = 40;

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
  const slop = (MinTouch - CHIP_HEIGHT) / 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: slop, bottom: slop }}
      style={[
        {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
        <Text variant="captionStrong" maxFontSizeMultiplier={1.2} style={{ color: fg }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
