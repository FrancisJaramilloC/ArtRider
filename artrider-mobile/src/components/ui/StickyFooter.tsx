import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

/** Pie de pantalla con borde superior, margen lateral estándar y safe area inferior (CTAs de ancho completo). */
export function StickyFooter({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const { gutter, insets, contentWidth } = useLayout();
  return (
    <View
      style={{
        paddingHorizontal: gutter,
        paddingTop: Spacing.three,
        paddingBottom: Math.max(insets.bottom, Spacing.three),
        gap: Spacing.three,
        borderTopWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ width: '100%', maxWidth: contentWidth - gutter * 2, alignSelf: 'center', gap: Spacing.three }}>{children}</View>
    </View>
  );
}
