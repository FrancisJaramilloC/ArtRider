import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Type, type ThemeColor, type TypeVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextProps = RNTextProps & {
  /** Variante de la escala tipográfica (por defecto `body`). */
  variant?: TypeVariant;
  /** Color semántico del tema (por defecto `text`). */
  color?: ThemeColor;
};

/** Límite de escalado de fuente: respeta accesibilidad sin romper el layout. */
const DEFAULT_MAX_FONT_SCALE = 1.3;

/**
 * Texto base del sistema de diseño. Usa solo la escala `Type` (Inter) y colores del
 * tema; evita `fontWeight` numérico sobre familias con peso incorporado.
 */
export function Text({ variant = 'body', color = 'text', style, maxFontSizeMultiplier, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? DEFAULT_MAX_FONT_SCALE}
      style={[Type[variant], { color: theme[color] }, style]}
      {...rest}
    />
  );
}
