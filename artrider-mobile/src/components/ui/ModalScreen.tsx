import type { ReactNode } from 'react';
import { Modal, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type ModalScreenProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Modal a pantalla completa con cabecera (título + cerrar). La zona segura se aplica con
 * `useSafeAreaInsets` (vía useLayout): `SafeAreaView` no la recibe dentro de un Modal en iOS y el
 * título quedaba bajo la barra de estado.
 */
export function ModalScreen({ visible, title, onClose, children }: ModalScreenProps) {
  const colors = useTheme();
  const { gutter, insets } = useLayout();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: gutter, paddingRight: gutter - 2, paddingVertical: Spacing.one }}>
          <Text variant="headline" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </Text>
          <IconButton icon="close" label="Cerrar" onPress={onClose} />
        </View>
        {children}
      </View>
    </Modal>
  );
}
