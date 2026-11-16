import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouch, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Etiqueta para lectores de pantalla (obligatoria: el botón no tiene texto). */
  label: string;
  /** `overlay`: círculo translúcido sobre fotos · `surface`: relleno neutro · `outline`: borde. */
  variant?: 'overlay' | 'surface' | 'outline';
  color?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VISUAL_SIZE = 40;

/** Botón de ícono con objetivo táctil de 44pt y círculo visual de 40pt. */
export function IconButton({ icon, onPress, label, variant = 'surface', color, loading = false, disabled = false, style }: IconButtonProps) {
  const colors = useTheme();
  const bg = variant === 'overlay' ? colors.onImageSurface : variant === 'surface' ? colors.backgroundElement : 'transparent';
  const fg = color ?? (variant === 'overlay' ? colors.onImage : colors.text);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[{ width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <View
        style={{
          width: VISUAL_SIZE,
          height: VISUAL_SIZE,
          borderRadius: Radius.full,
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={icon} size={20} color={fg} />}
      </View>
    </Pressable>
  );
}
