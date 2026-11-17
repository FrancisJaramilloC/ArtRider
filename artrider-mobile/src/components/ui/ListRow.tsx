import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RowHeight, Rhythm, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

export type ListRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** Muestra el chevron de navegación (por defecto true salvo en filas destructivas). */
  chevron?: boolean;
};

/** Fila de menú/ajustes: ícono, etiqueta y chevron, con objetivo táctil ≥ 44pt. */
export function ListRow({ icon, label, onPress, destructive = false, chevron }: ListRowProps) {
  const colors = useTheme();
  const fg = destructive ? colors.destructive : colors.text;
  const showChevron = chevron ?? !destructive;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ minHeight: RowHeight, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={{ width: 24, alignItems: 'center' }}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <Text variant="body" numberOfLines={1} style={{ flex: 1, color: fg }}>
        {label}
      </Text>
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

/** Rótulo de sección (mayúsculas, color tenue) con separación consistente. */
export function ListSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Rhythm.titleToContent, paddingTop: Rhythm.section }}>
      <Text variant="overline" color="textMuted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}
