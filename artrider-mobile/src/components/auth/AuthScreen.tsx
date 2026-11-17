import type { ReactNode, RefObject } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export type AuthScreenProps = {
  children: ReactNode;
  /** Del `useForm` de la pantalla: permite desplazarse hasta el primer campo con error. */
  scrollRef?: RefObject<ScrollViewInstance | null>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Centra el contenido en vertical (pantallas cortas como la de entrada). */
  centered?: boolean;
};

/**
 * Contenedor común de las pantallas de autenticación: área segura, ancho máximo de 480 y teclado.
 * iOS: el propio ScrollView sube su contenido con el teclado (`automaticallyAdjustKeyboardInsets`), así el
 * campo enfocado y el botón principal siempre se pueden ver. Android: KeyboardAvoidingView.
 */
export function AuthScreen({ children, scrollRef, onScroll, centered = false }: AuthScreenProps) {
  const colors = useTheme();
  const { gutter } = useLayout();

  const scroll = (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentContainerStyle={{ flexGrow: 1, justifyContent: centered ? 'center' : 'flex-start' }}
    >
      <View
        style={{
          paddingHorizontal: gutter,
          paddingTop: Spacing.three,
          paddingBottom: Spacing.five,
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
          gap: Spacing.three,
        }}
      >
        {children}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {Platform.OS === 'ios' ? scroll : <KeyboardAvoidingView style={{ flex: 1 }}>{scroll}</KeyboardAvoidingView>}
    </SafeAreaView>
  );
}
