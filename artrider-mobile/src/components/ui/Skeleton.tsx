import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { Aspect, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Bloque de carga con pulso suave. Decorativo: oculto para lectores de pantalla. */
export function Skeleton({ width = '100%', height = 16, radius = Radius.md, style }: SkeletonProps) {
  const colors = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.backgroundSelected, opacity }, style]}
    />
  );
}

/** Esqueleto de tarjeta de equipo/paquete (misma proporción que `ItemCard`). */
export function ItemCardSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width, gap: Spacing.two }}>
      <Skeleton height={width / Aspect.card} radius={Radius.card} />
      <Skeleton width="85%" height={14} />
      <Skeleton width="55%" height={12} />
      <Skeleton width="40%" height={14} />
    </View>
  );
}
