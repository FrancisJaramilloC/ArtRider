import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Rhythm, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/utils/haptics';

export type ActiveFilter = { id: string; label: string; onRemove: () => void };

/** Píldora de un filtro activo: se ve completa (alto de 44pt, sin recortes) y la X la quita. */
function ActiveFilterPill({ filter }: { filter: ActiveFilter }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={() => {
        hapticSelect();
        filter.onRemove();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Quitar filtro ${filter.label}`}
      style={({ pressed }) => ({
        minHeight: MinTouch,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        maxWidth: '100%',
        paddingLeft: Spacing.three,
        paddingRight: Spacing.snug,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text variant="captionStrong" color="primary" numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ flexShrink: 1 }}>
        {filter.label}
      </Text>
      <Ionicons name="close" size={16} color={colors.primary} />
    </Pressable>
  );
}

export type SearchFilterBarProps = {
  gutter: number;
  /** Nº de filtros activos (ciudad, precio, categoría) que muestra el botón «Filtros». */
  count: number;
  onOpenFilters: () => void;
  filters: ActiveFilter[];
};

/**
 * Botón «Filtros» (con contador) y los filtros activos como píldoras con X. Las píldoras pasan a la
 * línea siguiente en vez de desplazarse en horizontal: nada queda recortado en ningún ancho.
 */
export function SearchFilterBar({ gutter, count, onOpenFilters, filters }: SearchFilterBarProps) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, paddingHorizontal: gutter, marginTop: Rhythm.cardGap }}>
      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `Filtros, ${count} activos` : 'Filtros'}
        style={({ pressed }) => ({
          minHeight: MinTouch,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.two,
          paddingHorizontal: Spacing.three,
          borderRadius: Radius.full,
          borderWidth: 1,
          borderColor: count > 0 ? colors.text : colors.border,
          backgroundColor: colors.background,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="options-outline" size={16} color={colors.text} />
        <Text variant="captionStrong" maxFontSizeMultiplier={1.2}>
          Filtros
        </Text>
        {count > 0 ? (
          <View style={{ minWidth: 20, height: 20, paddingHorizontal: Spacing.one, borderRadius: Radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="captionStrong" maxFontSizeMultiplier={1.1} style={{ color: colors.onPrimary, fontSize: 12, lineHeight: 16 }}>
              {count}
            </Text>
          </View>
        ) : null}
      </Pressable>
      {filters.map((filter) => (
        <ActiveFilterPill key={filter.id} filter={filter} />
      ))}
    </View>
  );
}
