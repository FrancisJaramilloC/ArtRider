import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type QuantityStepperProps = {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
};

/** Fila «etiqueta + − n +» con botones de 44pt. */
export function QuantityStepper({ label, value, min = 1, max, onChange }: QuantityStepperProps) {
  const colors = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        backgroundColor: colors.backgroundElement,
        borderRadius: Radius.xl,
        paddingVertical: Spacing.two,
        paddingLeft: Spacing.three,
        paddingRight: Spacing.two,
      }}
    >
      <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton icon="remove" label="Disminuir cantidad" variant="outline" disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))} />
        <Text variant="subtitle" accessibilityLabel={`${value}`} style={{ minWidth: 28, textAlign: 'center' }}>
          {value}
        </Text>
        <IconButton icon="add" label="Aumentar cantidad" variant="outline" disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))} />
      </View>
    </View>
  );
}
