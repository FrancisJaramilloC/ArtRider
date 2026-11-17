import { useState } from 'react';
import { FlatList, Modal, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;
const BLACK = '#000000';

export type ImageViewerProps = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

type ZoomPageProps = {
  uri: string;
  width: number;
  height: number;
  backdrop: SharedValue<number>;
  onClose: () => void;
  onZoomChange: (zoomed: boolean) => void;
};

/** Una foto con pellizco, doble toque (zoom) y arrastre vertical para cerrar. */
function ZoomPage({ uri, width, height, backdrop, onClose, onZoomChange }: ZoomPageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  function setZoom(next: boolean) {
    setZoomed(next);
    onZoomChange(next);
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), MAX_ZOOM);
    })
    .onEnd(() => {
      if (scale.value <= 1.02) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
        scheduleOnRN(setZoom, false);
      } else {
        savedScale.value = scale.value;
        scheduleOnRN(setZoom, true);
      }
    });

  // Sin zoom, el arrastre solo se activa en vertical (el horizontal es del carrusel).
  const basePan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        const maxX = (width * (scale.value - 1)) / 2;
        const maxY = (height * (scale.value - 1)) / 2;
        tx.value = Math.min(Math.max(savedTx.value + e.translationX, -maxX), maxX);
        ty.value = Math.min(Math.max(savedTy.value + e.translationY, -maxY), maxY);
      } else {
        ty.value = e.translationY;
        backdrop.value = 1 - Math.min(Math.abs(e.translationY) / (height * 0.5), 1);
      }
    })
    .onEnd((e) => {
      if (scale.value > 1) {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      } else if (Math.abs(e.translationY) > DISMISS_DISTANCE || Math.abs(e.velocityY) > DISMISS_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        ty.value = withSpring(0);
        backdrop.value = withTiming(1);
      }
    });
  const pan = zoomed ? basePan.minDistance(2) : basePan.activeOffsetY([-14, 14]).failOffsetX([-14, 14]);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
        scheduleOnRN(setZoom, false);
      } else {
        scale.value = withTiming(DOUBLE_TAP_ZOOM);
        savedScale.value = DOUBLE_TAP_ZOOM;
        scheduleOnRN(setZoom, true);
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width, height }, imageStyle]}>
          <Image source={{ uri }} style={{ width, height }} contentFit="contain" cachePolicy="memory-disk" accessibilityIgnoresInvertColors />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/**
 * Visor a pantalla completa: fondo negro, swipe entre fotos, pellizco y doble toque para zoom,
 * arrastre hacia abajo para cerrar, botón X (44pt), contador y barra de estado oculta.
 */
export function ImageViewer({ visible, images, initialIndex = 0, onClose }: ImageViewerProps) {
  const colors = useTheme();
  const { insets, gutter } = useLayout();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const backdrop = useSharedValue(1);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  function handleClose() {
    backdrop.value = 1;
    setZoomed(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={handleClose} statusBarTranslucent onShow={() => setIndex(initialIndex)}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: BLACK }}>
        {visible ? <StatusBar hidden /> : null}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BLACK }, backdropStyle]} />
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          bounces={false}
          scrollEnabled={!zoomed && images.length > 1}
          initialScrollIndex={Math.min(initialIndex, Math.max(images.length - 1, 0))}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => <ZoomPage uri={item} width={width} height={height} backdrop={backdrop} onClose={handleClose} onZoomChange={setZoomed} />}
        />

        <Animated.View
          pointerEvents="box-none"
          style={[{ position: 'absolute', top: insets.top + Spacing.one, left: gutter - 2, right: gutter - 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, backdropStyle]}
        >
          <IconButton icon="close" label="Cerrar visor" variant="overlay" onPress={handleClose} />
          {images.length > 1 ? (
            <View accessibilityLabel={`Foto ${index + 1} de ${images.length}`} style={{ backgroundColor: colors.onImageSurface, borderRadius: Radius.full, paddingHorizontal: Spacing.snug, paddingVertical: Spacing.one }}>
              <Text variant="captionStrong" style={{ color: colors.onImage }}>
                {index + 1}/{images.length}
              </Text>
            </View>
          ) : null}
          <View style={{ width: 44 }} />
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
