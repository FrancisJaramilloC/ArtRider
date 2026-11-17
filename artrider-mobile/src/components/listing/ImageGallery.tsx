import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

/** Proporción de la foto del carrusel (ancho : alto = 4 : 3). */
const GALLERY_ASPECT = 4 / 3;
/** Alto máximo en tablets para que la foto no domine el layout. */
const MAX_GALLERY_HEIGHT = 420;
const THUMB_SIZE = 64;

/** Alto de la galería para un ancho dado (4:3, máx. 420). */
export function galleryHeight(width: number): number {
  return Math.min(Math.round(width / GALLERY_ASPECT), MAX_GALLERY_HEIGHT);
}

export type ImageGalleryProps = {
  images: string[];
  /** Se llama al tocar una foto con su índice (abre el visor a pantalla completa). */
  onPressImage?: (index: number) => void;
};

type PhotoState = 'loading' | 'ready' | 'error';

/** Foto con placeholder mientras carga y estado de error con reintento al tocar. */
function PhotoSlot({ uri, width, height, label, onPress }: { uri: string; width: number; height: number; label: string; onPress?: () => void }) {
  const colors = useTheme();
  const [state, setState] = useState<PhotoState>('loading');
  const [attempt, setAttempt] = useState(0);

  function handlePress() {
    if (state === 'error') {
      setState('loading');
      setAttempt((n) => n + 1);
      return;
    }
    onPress?.();
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="imagebutton"
      accessibilityLabel={state === 'error' ? `${label}. No se pudo cargar, toca para reintentar` : `${label}. Toca para ver a pantalla completa`}
      style={{ width, height, backgroundColor: colors.imageBackdrop }}
    >
      {state !== 'error' ? (
        <Image
          key={attempt}
          source={{ uri }}
          style={{ width, height }}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}>
          <Ionicons name="image-outline" size={36} color={colors.textSecondary} />
          <Text variant="caption" color="textSecondary">
            No se pudo cargar la foto
          </Text>
        </View>
      )}
      {state === 'loading' ? <Skeleton width={width} height={height} radius={0} style={{ position: 'absolute', top: 0, left: 0 }} /> : null}
    </Pressable>
  );
}

/**
 * Galería estilo Airbnb: carrusel paginado a ancho completo (4:3), contador «1/5» abajo a la derecha,
 * puntos discretos y tira de miniaturas que cambia la foto activa. Con una sola foto no hay indicadores.
 */
export function ImageGallery({ images, onPressImage }: ImageGalleryProps) {
  const colors = useTheme();
  const { gutter } = useLayout();
  const { width } = useWindowDimensions();
  const height = galleryHeight(width);
  const listRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const multiple = images.length > 1;

  // Precarga la foto siguiente para que el swipe no muestre el placeholder.
  useEffect(() => {
    const next = images[activeIndex + 1];
    if (next) Image.prefetch(next, { cachePolicy: 'memory-disk' }).catch(() => {});
  }, [activeIndex, images]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== activeIndex && next >= 0 && next < images.length) setActiveIndex(next);
  }

  function goTo(index: number) {
    setActiveIndex(index);
    listRef.current?.scrollToOffset({ offset: index * width, animated: true });
  }

  if (images.length === 0) {
    return (
      <View style={{ width, height, backgroundColor: colors.imageBackdrop, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}>
        <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
        <Text variant="caption" color="textSecondary">
          Sin fotos
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={{ width, height, backgroundColor: colors.imageBackdrop }}>
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          bounces={false}
          scrollEnabled={multiple}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <PhotoSlot uri={item} width={width} height={height} label={`Foto ${index + 1} de ${images.length}`} onPress={() => onPressImage?.(index)} />
          )}
        />

        {multiple ? (
          <>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', right: gutter, bottom: Spacing.three, backgroundColor: colors.onImageSurface, borderRadius: Radius.full, paddingHorizontal: Spacing.snug, paddingVertical: Spacing.one }}
            >
              <Text variant="captionStrong" style={{ color: colors.onImage }}>
                {activeIndex + 1}/{images.length}
              </Text>
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', bottom: Spacing.three + 6, alignSelf: 'center', flexDirection: 'row', gap: Spacing.one }}>
              {images.map((_, i) => (
                <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.onImage, opacity: i === activeIndex ? 1 : 0.45 }} />
              ))}
            </View>
          </>
        ) : null}
      </View>

      {multiple ? (
        <FlatList
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `thumb-${uri}-${i}`}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Spacing.three, gap: Spacing.two }}
          renderItem={({ item, index }) => {
            const active = index === activeIndex;
            return (
              <Pressable
                onPress={() => goTo(index)}
                accessibilityRole="button"
                accessibilityLabel={`Ver foto ${index + 1}`}
                accessibilityState={{ selected: active }}
                style={{
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: Radius.lg,
                  overflow: 'hidden',
                  backgroundColor: colors.imageBackdrop,
                  borderWidth: 2,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: active ? 1 : 0.8,
                }}
              >
                <Image source={{ uri: item }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" accessibilityIgnoresInvertColors />
              </Pressable>
            );
          }}
        />
      ) : null}
    </View>
  );
}
