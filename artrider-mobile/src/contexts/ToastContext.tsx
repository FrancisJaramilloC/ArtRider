import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess } from '@/utils/haptics';

const TOAST_DURATION_MS = 3000;
const TOAST_ANIMATION_MS = 220;
const TOAST_OFFSET = 24;

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** Aviso breve y no bloqueante, anclado arriba. Un solo toast a la vez (el nuevo reemplaza al anterior). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const { gutter, insets } = useLayout();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: TOAST_ANIMATION_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMessage(null);
    });
  }, [opacity]);

  const showToast = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      hapticSuccess();
      Animated.timing(opacity, { toValue: 1, duration: TOAST_ANIMATION_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      timer.current = setTimeout(hide, TOAST_DURATION_MS);
    },
    [hide, opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            top: insets.top + Spacing.two,
            left: gutter,
            right: gutter,
            alignItems: 'center',
            opacity,
            transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-TOAST_OFFSET, 0] }) }],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.two,
              maxWidth: 480,
              backgroundColor: colors.text,
              borderRadius: Radius.full,
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.three,
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text variant="bodyStrong" style={{ color: colors.background, flexShrink: 1 }}>
              {message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
