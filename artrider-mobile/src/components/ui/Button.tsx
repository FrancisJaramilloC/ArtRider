import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticTap } from '@/utils/haptics';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'sm';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  /** CTA de ancho completo (por defecto true en `md`). */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT: Record<ButtonSize, number> = { md: 52, sm: MinTouch };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const colors = useTheme();
  const isDisabled = disabled || loading;
  const stretch = fullWidth ?? size === 'md';

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
    secondary: { bg: 'transparent', fg: colors.text, border: colors.text },
    tonal: { bg: colors.primarySoft, fg: colors.primary, border: 'transparent' },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    destructive: { bg: 'transparent', fg: colors.destructive, border: colors.destructive },
  }[variant];

  return (
    <Pressable
      onPress={() => {
        // Sin doble toque: `loading` ya deshabilita el botón. Háptica ligera en toda acción.
        hapticTap();
        onPress();
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        {
          minHeight: HEIGHT[size],
          alignSelf: stretch ? 'stretch' : 'flex-start',
          borderRadius: Radius.xl,
          borderWidth: palette.border === 'transparent' ? 0 : 1.5,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          paddingHorizontal: size === 'md' ? Spacing.four : Spacing.three,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={size === 'md' ? 20 : 18} color={palette.fg} /> : null}
            <Text
              variant="button"
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={{ color: palette.fg, fontSize: size === 'md' ? 16 : 14 }}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}
