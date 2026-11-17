import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

export type BadgeIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Etiqueta base; con `count` > 0 se completa con el número para lectores de pantalla. */
  label: string;
  /** Sustantivo para el conteo hablado, p. ej. «artículos». */
  countNoun?: [singular: string, plural: string];
  count?: number;
};

/** Botón circular de cabecera (44pt) con badge numérico: mismo tamaño y estilo para carrito y favoritos. */
export function BadgeIconButton({ icon, onPress, label, countNoun, count = 0 }: BadgeIconButtonProps) {
  const colors = useTheme();
  const spoken = count > 0 && countNoun ? `${label}, ${count} ${count === 1 ? countNoun[0] : countNoun[1]}` : label;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      style={({ pressed }) => ({
        width: MinTouch,
        height: MinTouch,
        borderRadius: Radius.full,
        backgroundColor: colors.backgroundElement,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
      {count > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: Spacing.one,
          }}
        >
          <Text variant="captionStrong" maxFontSizeMultiplier={1} style={{ fontSize: 10, lineHeight: 14, color: colors.onPrimary }}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
