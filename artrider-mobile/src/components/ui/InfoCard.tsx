import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

/** Tarjeta con título en mayúsculas pequeñas y contenido: la base de las pantallas de detalle de reserva (Rider y Partner). */
export function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding + Spacing.one, gap: Rhythm.cardPadding }}>
      <Text variant="overline" color="textSecondary" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}
