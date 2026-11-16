import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

export type PriceLine = { label: string; value: string; strong?: boolean };

/** Desglose de precios: líneas de detalle y total destacado con línea divisoria. */
export function PriceSummary({ lines, totalLabel = 'Total', total }: { lines: PriceLine[]; totalLabel?: string; total: string }) {
  const colors = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      {lines.map((line) => (
        <View key={line.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
          <Text variant="body" color="textSecondary" style={{ flexShrink: 1 }}>
            {line.label}
          </Text>
          <Text variant={line.strong ? 'bodyStrong' : 'body'}>{line.value}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingTop: Spacing.two, borderTopWidth: 1, borderColor: colors.border }}>
        <Text variant="subtitle">{totalLabel}</Text>
        <Text variant="subtitle">{total}</Text>
      </View>
    </View>
  );
}
