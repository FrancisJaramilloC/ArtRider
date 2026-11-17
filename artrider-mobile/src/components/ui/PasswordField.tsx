import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouch, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { passwordRequirements } from '@/utils/validation';
import { FormField, type FormFieldProps } from './FormField';
import { Text } from './Text';

export type PasswordFieldProps = Omit<FormFieldProps, 'secureTextEntry' | 'rightAccessory' | 'leftIcon'>;

/**
 * Campo de contraseña con ojito para mostrar/ocultar. Cada pantalla debe indicar `textContentType` y
 * `autoComplete` (`password` / `current-password` en Login; `newPassword` / `new-password` en Registro)
 * para el relleno automático de iOS y Android.
 */
export function PasswordField(props: PasswordFieldProps) {
  const colors = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      leftIcon="lock-closed-outline"
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      rightAccessory={
        <Pressable
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          hitSlop={Spacing.one}
          style={{ minWidth: MinTouch, minHeight: MinTouch, alignItems: 'center', justifyContent: 'center', marginRight: -Spacing.two }}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
        </Pressable>
      }
    />
  );
}

/** Lista de requisitos de la contraseña; cada uno se marca al cumplirse. */
export function PasswordRequirements({ value }: { value: string }) {
  const colors = useTheme();
  return (
    <View accessibilityRole="summary" style={{ gap: Spacing.one }}>
      {passwordRequirements(value).map((requirement) => (
        <View
          key={requirement.key}
          accessible
          accessibilityLabel={`${requirement.label}: ${requirement.met ? 'cumplido' : 'pendiente'}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}
        >
          <Ionicons
            name={requirement.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={requirement.met ? colors.primary : colors.textSecondary}
          />
          <Text variant="caption" color={requirement.met ? 'text' : 'textSecondary'}>
            {requirement.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
