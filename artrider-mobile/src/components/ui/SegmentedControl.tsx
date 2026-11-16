import { Pressable, View } from 'react-native';

import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

export type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
};

/** Control segmentado (p. ej. tema Claro/Oscuro): la opción activa va con el acento. */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const colors = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', gap: Spacing.one, borderRadius: Radius.xl, padding: Spacing.one, backgroundColor: colors.backgroundElement }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              minHeight: MinTouch,
              borderRadius: Radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
            }}
          >
            <Text variant="captionStrong" style={{ color: active ? colors.onPrimary : colors.textSecondary }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
