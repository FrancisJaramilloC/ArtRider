import type { ReactNode, RefObject } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouch, Radius, Spacing } from '@/constants/theme';
import type { FieldViewInstance } from '@/hooks/useForm';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/utils/haptics';
import { Text } from './Text';

export type CheckboxRowProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Texto de la casilla; admite `<Text onPress>` anidados para enlaces. */
  children: ReactNode;
  /** Texto para lectores de pantalla (el contenido con enlaces no se lee bien como una sola etiqueta). */
  accessibilityLabel: string;
  error?: string | null;
  /** Referencia de vista para que el formulario pueda desplazarse hasta la casilla con error. */
  viewRef?: RefObject<FieldViewInstance | null>;
};

/** Casilla con texto a la derecha, área táctil de 44pt y mensaje de error con el mismo estilo que los campos. */
export function CheckboxRow({ checked, onChange, children, accessibilityLabel, error, viewRef }: CheckboxRowProps) {
  const colors = useTheme();

  return (
    <View ref={viewRef} style={{ gap: Spacing.two }}>
      <Pressable
        onPress={() => {
          hapticSelect();
          onChange(!checked);
        }}
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked }}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.snug, minHeight: MinTouch }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            marginTop: Spacing.half,
            borderRadius: Radius.sm,
            borderWidth: 2,
            borderColor: error ? colors.destructive : checked ? colors.primary : colors.textSecondary,
            backgroundColor: checked ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
        </View>
        <Text variant="body" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </Text>
      </Pressable>
      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive} style={{ marginTop: Spacing.half }} />
          <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
