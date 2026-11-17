import { useState, type ReactNode, type RefObject } from 'react';
import { TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FieldHeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './Button';
import { Text } from './Text';

export type FormFieldProps = Omit<TextInputProps, 'style' | 'ref'> & {
  label: string;
  error?: string | null;
  /** Ayuda corta bajo el campo (se oculta si hay error). */
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Contenido a la derecha del label (p. ej. «¿La olvidaste?»). */
  labelAccessory?: ReactNode;
  /** Elemento dentro del campo, a la derecha (p. ej. ver contraseña). */
  rightAccessory?: ReactNode;
  inputRef?: RefObject<TextInputInstance | null>;
  /** Alto mínimo mayor para campos de varias líneas. */
  multiline?: boolean;
};

/**
 * Campo de formulario: etiqueta, entrada de 52pt, borde que cambia (foco / error) y mensaje de error
 * debajo con ícono. Accesible: la etiqueta y la ayuda/error se anuncian juntas.
 */
export function FormField({ label, error, hint, leftIcon, labelAccessory, rightAccessory, inputRef, multiline, onFocus, onBlur, ...inputProps }: FormFieldProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.destructive : focused ? colors.primary : 'transparent';

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="bodyStrong">{label}</Text>
        {labelAccessory}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: colors.backgroundElement,
          borderRadius: Radius.xl,
          borderWidth: 1.5,
          borderColor,
          paddingHorizontal: Spacing.three,
        }}
      >
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={error ? colors.destructive : colors.textSecondary} style={multiline ? { marginTop: Spacing.three } : undefined} /> : null}
        <TextInput
          ref={inputRef}
          multiline={multiline}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          aria-invalid={!!error}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            minHeight: multiline ? FieldHeight * 2 : FieldHeight,
            paddingVertical: Spacing.snug,
            paddingHorizontal: Spacing.two,
            fontSize: 15,
            fontFamily: 'Inter_400Regular',
            color: colors.text,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          {...inputProps}
        />
        {rightAccessory}
      </View>

      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive} style={{ marginTop: Spacing.half }} />
          <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Error del servidor arriba del formulario, con «Reintentar» (repite el último envío). */
export function FormErrorBanner({
  message,
  onRetry,
  retrying = false,
  children,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** Acciones propias bajo el mensaje (p. ej. enlaces a «Iniciar sesión»). */
  children?: ReactNode;
}) {
  const colors = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.destructiveSoft,
        borderWidth: 1,
        borderColor: colors.destructive,
        borderRadius: Radius.lg,
        padding: Spacing.three,
        gap: Spacing.two,
      }}
    >
      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' }}>
        <Ionicons name="alert-circle" size={20} color={colors.destructive} />
        <Text variant="body" color="destructive" style={{ flex: 1, minWidth: 0 }}>
          {message}
        </Text>
      </View>
      {children}
      {onRetry ? <Button label="Reintentar" variant="destructive" size="sm" fullWidth={false} loading={retrying} onPress={onRetry} /> : null}
    </View>
  );
}
