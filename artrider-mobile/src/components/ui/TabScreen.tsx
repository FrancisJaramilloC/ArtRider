import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

/** Alto mínimo común de la cabecera de pestañas: el contenido arranca en la misma y en todas. */
const HEADER_HEIGHT = 56;

export type TabScreenProps = {
  title: string;
  /** Acciones a la derecha (IconButton de 44pt). */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Pantalla de pestaña: safe area superior, cabecera única (título a la izquierda, acciones a la
 * derecha, mismo alto y mismo desplazamiento superior) y área de contenido. Todas las pestañas del
 * cliente y del proveedor la usan, así los chips y el contenido arrancan en la misma coordenada y.
 */
export function TabScreen({ title, actions, children }: TabScreenProps) {
  const colors = useTheme();
  const { gutter, contentWidth } = useLayout();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}>
        <View
          testID="tab-header"
          style={{ minHeight: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: gutter, paddingRight: gutter - 2 }}
        >
          <Text testID="tab-title" variant="title" numberOfLines={1} accessibilityRole="header" style={{ flex: 1, minWidth: 0 }}>
            {title}
          </Text>
          {actions ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>{actions}</View> : null}
        </View>
        <View testID="tab-content" style={{ flex: 1 }}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}
