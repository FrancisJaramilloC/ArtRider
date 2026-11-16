import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Bottom sheet (estilo Uber): fondo atenuado que cierra al tocar, hoja redondeada anclada
 * abajo con safe area, asa visual y manejo de teclado. Sustituye a los modales centrados.
 */
export function Sheet({ visible, onClose, children }: SheetProps) {
  const colors = useTheme();
  const { gutter, insets, contentWidth } = useLayout();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' }}
        >
          {/* Evita que un toque dentro de la hoja la cierre. */}
          <Pressable
            accessible={false}
            style={{
              width: '100%',
              maxWidth: contentWidth,
              alignSelf: 'center',
              maxHeight: '90%',
              backgroundColor: colors.background,
              borderTopLeftRadius: Radius.sheet,
              borderTopRightRadius: Radius.sheet,
              paddingHorizontal: gutter,
              paddingTop: Spacing.two,
              paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two,
            }}
          >
            <View
              style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: Spacing.three }}
            />
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
