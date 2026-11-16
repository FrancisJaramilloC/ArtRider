import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = {
  children: ReactNode;
  /** Contenido desplazable (ScrollView). Si es false, ocupa el alto sin scroll. */
  scroll?: boolean;
  /** Aplica el margen lateral estándar (por defecto true). */
  padded?: boolean;
  /** Bordes con safe area (por defecto solo arriba: la barra de pestañas gestiona el inferior). */
  edges?: Edge[];
  /** Reserva espacio inferior para la barra de pestañas flotante (pantallas dentro de tabs). */
  tabBar?: boolean;
  /** Evita que el teclado tape el contenido (formularios). */
  keyboard?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Contenedor de pantalla: safe area, fondo del tema, margen lateral único, ancho máximo
 * centrado en tablets y espacio inferior para la barra de pestañas (Liquid Glass en iOS 26).
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  tabBar = false,
  keyboard = false,
  refreshControl,
  contentContainerStyle,
}: ScreenProps) {
  const colors = useTheme();
  const { gutter, contentWidth, bottomInset } = useLayout();

  const inner: ViewStyle = {
    width: '100%',
    maxWidth: contentWidth,
    alignSelf: 'center',
    paddingHorizontal: padded ? gutter : 0,
  };

  const body = scroll ? (
    <ScrollView
      // iOS: el sistema suma el inset de la barra de pestañas nativa (contenido bajo Liquid Glass).
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[inner, { paddingBottom: tabBar ? Spacing.five : Spacing.four }, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingBottom: tabBar && Platform.OS === 'ios' ? bottomInset : 0 }, inner, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
