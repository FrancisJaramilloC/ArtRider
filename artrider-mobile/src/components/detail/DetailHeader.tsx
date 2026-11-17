import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { FavoriteAccent, MinTouch, Radius } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

/** Alto de la barra sólida (sin safe area). */
export const DETAIL_HEADER_BAR = 56;
/** Tramo de scroll (px) en el que la barra pasa de transparente a sólida. */
const FADE_RANGE = 48;
const CIRCLE = 40;

export type DetailHeaderProps = {
  /** Scroll vertical del contenido (hilo UI). Sin él, la barra es siempre sólida (carga/errores). */
  scrollY?: SharedValue<number>;
  /** Scroll a partir del cual empieza la transición (normalmente alto de la foto − barra). */
  fadeStart?: number;
  /** Título corto que aparece en la barra sólida. */
  title?: string;
  esFavorito?: boolean;
  /** Sin esta función no se muestra el corazón. */
  onToggleFavorito?: () => void;
};

/**
 * Capa fija encima del scroll: atrás y corazón siempre visibles (44pt, safe area superior).
 * Sobre la foto son círculos translúcidos; al bajar el scroll se funden con una barra sólida
 * con el título. Todo se anima con Reanimated en el hilo UI, sin saltos.
 */
export function DetailHeader({ scrollY, fadeStart = 0, title, esFavorito = false, onToggleFavorito }: DetailHeaderProps) {
  const router = useRouter();
  const colors = useTheme();
  const { gutter, insets } = useLayout();

  const solidStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, [fadeStart, fadeStart + FADE_RANGE], [0, 1], Extrapolation.CLAMP) : 1,
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, [fadeStart, fadeStart + FADE_RANGE], [1, 0], Extrapolation.CLAMP) : 0,
  }));

  const buttonsTop = insets.top + (DETAIL_HEADER_BAR - MinTouch) / 2;
  const sideInset = gutter - (MinTouch - CIRCLE) / 2;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10 }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            height: insets.top + DETAIL_HEADER_BAR,
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderColor: colors.border,
          },
          solidStyle,
        ]}
      />
      {title ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: insets.top, left: sideInset + MinTouch + 8, right: sideInset + MinTouch + 8, height: DETAIL_HEADER_BAR, justifyContent: 'center' },
            solidStyle,
          ]}
        >
          <Text variant="bodyStrong" numberOfLines={1} style={{ textAlign: 'center' }}>
            {title}
          </Text>
        </Animated.View>
      ) : null}

      <HeaderButton
        icon="arrow-back"
        label="Volver"
        onPress={() => router.back()}
        overlayStyle={overlayStyle}
        solidStyle={solidStyle}
        style={{ position: 'absolute', top: buttonsTop, left: sideInset }}
      />
      {onToggleFavorito ? (
        <HeaderButton
          icon={esFavorito ? 'heart' : 'heart-outline'}
          label={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          onPress={onToggleFavorito}
          activeColor={esFavorito ? FavoriteAccent : undefined}
          overlayStyle={overlayStyle}
          solidStyle={solidStyle}
          style={{ position: 'absolute', top: buttonsTop, right: sideInset }}
        />
      ) : null}
    </View>
  );
}

type HeaderButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Color fijo del ícono (corazón activo), igual sobre foto y sobre barra sólida. */
  activeColor?: string;
  overlayStyle: object;
  solidStyle: object;
  style: object;
};

function HeaderButton({ icon, label, onPress, activeColor, overlayStyle, solidStyle, style }: HeaderButtonProps) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }, style]}
    >
      <Animated.View style={[{ position: 'absolute', width: CIRCLE, height: CIRCLE, borderRadius: Radius.full, backgroundColor: colors.onImageSurface }, overlayStyle]} />
      <Animated.View style={[{ position: 'absolute' }, overlayStyle]}>
        <Ionicons name={icon} size={20} color={activeColor ?? colors.onImage} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, solidStyle]}>
        <Ionicons name={icon} size={20} color={activeColor ?? colors.text} />
      </Animated.View>
    </Pressable>
  );
}
