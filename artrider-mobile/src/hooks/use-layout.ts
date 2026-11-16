import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Breakpoints, Gutter, Rhythm, Spacing } from '@/constants/theme';

/** Ancho máximo del contenido en pantallas ≥ 600 (centrado): 720 en tablet vertical, 960 en horizontal. */
const TABLET_CONTENT_MAX = 720;
const TABLET_CONTENT_MAX_WIDE = 960;

/** Alto aproximado de la barra de pestañas flotante de iOS 26 (Liquid Glass), sin safe area. */
const FLOATING_TAB_BAR_HEIGHT = 72;

export type Breakpoint = 'compact' | 'regular' | 'tablet';

export type LayoutInfo = {
  /** Ancho de ventana reactivo (rotación, split view). */
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isCompact: boolean;
  isTablet: boolean;
  /** Margen lateral de pantalla, igual en todas las pantallas. */
  gutter: number;
  /** Ancho útil del contenido (limitado en tablets). */
  contentWidth: number;
  /** Columnas recomendadas para una grilla de tarjetas. */
  columns: number;
  /** Ancho de una tarjeta de grilla dado el nº de columnas y el hueco entre ellas. */
  cardWidth: (cols?: number, gap?: number) => number;
  /** Ancho de una tarjeta de carrusel horizontal (deja ver un poco de la siguiente). */
  carouselCardWidth: number;
  /**
   * Espacio inferior para elementos flotantes/absolutos que no deben quedar bajo la barra de
   * pestañas. En iOS la barra flota sobre el contenido; en Android el contenido termina encima.
   */
  bottomInset: number;
  insets: { top: number; bottom: number; left: number; right: number };
};

function getBreakpoint(width: number): Breakpoint {
  if (width < Breakpoints.compactMax) return 'compact';
  if (width > Breakpoints.tabletMin) return 'tablet';
  return 'regular';
}

/**
 * Layout responsivo: columnas y anchos de tarjeta según el ancho real.
 * Breakpoints: < 360 compact (320/340), 360–600 regular (360/390/430), > 600 tablet.
 */
export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const breakpoint = getBreakpoint(width);
  const gutter = Gutter[breakpoint];
  const contentWidth = breakpoint === 'tablet' ? Math.min(width, width >= 900 ? TABLET_CONTENT_MAX_WIDE : TABLET_CONTENT_MAX) : width;
  const columns = breakpoint === 'tablet' ? (contentWidth >= 900 ? 4 : 3) : 2;
  const innerWidth = contentWidth - gutter * 2;
  const gap = Rhythm.cardGap;

  const cardWidth = (cols: number = columns, cardGap: number = gap) => Math.floor((innerWidth - cardGap * (cols - 1)) / cols);
  // Carrusel: n tarjetas completas + 15 % de la siguiente asomando (2 en teléfono, 3 en ≥ 600).
  const fullCards = breakpoint === 'tablet' ? 3 : 2;
  const carouselCardWidth = Math.floor((contentWidth - gutter - fullCards * gap) / (fullCards + 0.15));

  return {
    width,
    height,
    breakpoint,
    isCompact: breakpoint === 'compact',
    isTablet: breakpoint === 'tablet',
    gutter,
    contentWidth,
    columns,
    cardWidth,
    carouselCardWidth,
    bottomInset: Platform.OS === 'ios' ? insets.bottom + FLOATING_TAB_BAR_HEIGHT : Spacing.three,
    insets,
  };
}
