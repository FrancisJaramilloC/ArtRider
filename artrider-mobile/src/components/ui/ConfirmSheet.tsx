import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

export type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Acción destructiva: el botón de confirmar usa el tono de peligro. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmación en bottom sheet: título, mensaje y dos acciones de ancho completo. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Volver',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <View style={{ gap: Spacing.two, paddingBottom: Spacing.four }}>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" color="textSecondary">
          {message}
        </Text>
      </View>
      <View style={{ gap: Spacing.two }}>
        <Button
          label={confirmLabel}
          onPress={onConfirm}
          loading={loading}
          variant={destructive ? 'destructive' : 'primary'}
        />
        <Button label={cancelLabel} onPress={onCancel} variant="ghost" />
      </View>
    </Sheet>
  );
}
