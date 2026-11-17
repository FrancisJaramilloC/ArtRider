import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { animateLayout } from '@/utils/motion';
import { withAlpha } from '@/utils/color';
import { Chip } from './Chip';

export type ChipOption<T extends string> = { id: T; label: string; icon?: keyof typeof Ionicons.glyphMap };

const FADE_WIDTH = 40;

/**
 * Carrusel de chips de filtro: primera chip al margen y padding final igual al margen, la chip
 * seleccionada se desplaza a la vista y un degradado sutil en el borde derecho indica que hay más.
 */
export function ChipRow<T extends string>({ options, value, onChange }: { options: ChipOption<T>[]; value: T; onChange: (next: T) => void }) {
  const colors = useTheme();
  const { gutter, width } = useLayout();
  const ref = useRef<ScrollViewInstance>(null);
  const spots = useRef<Record<string, { x: number; w: number }>>({});
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);

  const hasMore = contentWidth > width + 1 && offset + width < contentWidth - 4;

  // Mantiene la chip seleccionada completamente visible.
  useEffect(() => {
    const spot = spots.current[value];
    if (!spot) return;
    if (spot.x < offset + gutter) ref.current?.scrollTo({ x: Math.max(0, spot.x - gutter), animated: true });
    else if (spot.x + spot.w > offset + width - gutter) ref.current?.scrollTo({ x: spot.x + spot.w - width + gutter, animated: true });
    // Solo al cambiar la selección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <View testID="chip-row">
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        scrollEventThrottle={32}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => setOffset(e.nativeEvent.contentOffset.x)}
        onContentSizeChange={(w) => setContentWidth(w)}
        contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: gutter, alignItems: 'center' }}
      >
        {options.map((o) => (
          <View
            key={o.id}
            onLayout={(e: LayoutChangeEvent) => {
              spots.current[o.id] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
            }}
          >
            <Chip
              label={o.label}
              icon={o.icon}
              active={o.id === value}
              onPress={() => {
                animateLayout();
                onChange(o.id);
              }}
            />
          </View>
        ))}
      </ScrollView>
      {hasMore ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: FADE_WIDTH }}>
          <LinearGradient colors={[withAlpha(colors.background, 0), colors.background]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </View>
      ) : null}
    </View>
  );
}
