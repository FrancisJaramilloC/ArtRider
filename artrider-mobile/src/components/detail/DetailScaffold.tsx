import { useState, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DETAIL_HEADER_BAR, DetailHeader } from '@/components/detail/DetailHeader';
import { DetailSheet } from '@/components/detail/DetailParts';
import { ImageGallery, galleryHeight } from '@/components/listing/ImageGallery';
import { ImageViewer } from '@/components/listing/ImageViewer';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { ErrorInfo } from '@/utils/errors';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/Skeleton';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

/** Aire bajo el último bloque (la barra inferior va en flujo, no encima del scroll). */
const CONTENT_BOTTOM_GAP = 24;

export type DetailScaffoldProps = {
  title: string;
  images: string[];
  esFavorito: boolean;
  onToggleFavorito: () => void;
  /** Aviso discreto bajo la galería (p. ej. fotos que no cargaron). */
  notice?: string;
  /** Barra inferior fija (StickyFooter). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Armazón común del detalle de equipo y de paquete: scroll nativo con la galería arriba, cabecera fija
 * (atrás/corazón siempre visibles), visor a pantalla completa y barra de reserva fija abajo.
 */
export function DetailScaffold({ title, images, esFavorito, onToggleFavorito, notice, footer, children }: DetailScaffoldProps) {
  const colors = useTheme();
  const { insets, gutter } = useLayout();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fadeStart = Math.max(galleryHeight(width) - insets.top - DETAIL_HEADER_BAR - 24, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: CONTENT_BOTTOM_GAP }}
      >
        <ImageGallery images={images} onPressImage={setViewerIndex} />
        {notice ? (
          <View accessibilityRole="alert" style={{ paddingHorizontal: gutter, paddingTop: Spacing.two }}>
            <Text variant="caption" color="textSecondary">
              {notice}
            </Text>
          </View>
        ) : null}
        <DetailSheet>{children}</DetailSheet>
      </Animated.ScrollView>

      <DetailHeader scrollY={scrollY} fadeStart={fadeStart} title={title} esFavorito={esFavorito} onToggleFavorito={onToggleFavorito} />
      {footer}

      <ImageViewer visible={viewerIndex !== null} images={images} initialIndex={viewerIndex ?? 0} onClose={() => setViewerIndex(null)} />
    </View>
  );
}

/** Carga: mismo layout que el detalle (foto 4:3, título, tarjetas) con la cabecera fija ya visible. */
export function DetailSkeleton() {
  const colors = useTheme();
  const { gutter } = useLayout();
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Skeleton height={galleryHeight(width)} radius={0} />
      <View style={{ paddingHorizontal: gutter, paddingTop: Spacing.four, gap: Rhythm.titleToContent }}>
        <Skeleton width={90} height={24} radius={Radius.full} />
        <Skeleton width="80%" height={28} />
        <Skeleton width="50%" height={16} />
        <Skeleton height={64} radius={Radius.card} style={{ marginTop: Rhythm.section - Rhythm.titleToContent }} />
        <Skeleton height={96} radius={Radius.card} style={{ marginTop: Rhythm.section - Rhythm.titleToContent }} />
      </View>
      <DetailHeader />
    </View>
  );
}

export type DetailMessageProps =
  | { kind: 'error'; error: ErrorInfo | null; onRetry: () => void }
  | { kind: 'not-found'; title: string; onBack: () => void };

/** Error de carga (con Reintentar) o equipo/paquete no encontrado, con la flecha atrás siempre disponible. */
export function DetailMessage(props: DetailMessageProps) {
  const colors = useTheme();
  const { insets } = useLayout();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', paddingTop: insets.top > 0 ? DETAIL_HEADER_BAR : 0 }}>
      {props.kind === 'error' ? (
        <ErrorState error={props.error} onRetry={props.onRetry} />
      ) : (
        <EmptyState icon="alert-circle-outline" tone="error" title={props.title} description="Puede que ya no esté publicado." actionLabel="Volver" onAction={props.onBack} />
      )}
      <DetailHeader />
    </SafeAreaView>
  );
}
