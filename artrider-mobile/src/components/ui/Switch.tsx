import { Switch as RNSwitch, View } from 'react-native';

import { MinTouch } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/utils/haptics';

export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Etiqueta de accesibilidad (obligatoria: el interruptor no tiene texto propio). */
  label: string;
  disabled?: boolean;
};

/**
 * Interruptor de tamaño nativo dentro de un contenedor táctil de 44pt, con el acento de marca y
 * háptica de selección. La lógica (onValueChange) la define quien lo usa.
 */
export function Switch({ value, onValueChange, label, disabled = false }: SwitchProps) {
  const colors = useTheme();
  return (
    <View style={{ minHeight: MinTouch, minWidth: MinTouch, justifyContent: 'center' }}>
      <RNSwitch
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          hapticSelect();
          onValueChange(next);
        }}
        trackColor={{ true: colors.primary, false: colors.backgroundSelected }}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
      />
    </View>
  );
}
