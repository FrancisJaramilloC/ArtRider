import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Breakpoints, Gutter, MaxContentWidth, Spacing } from '@/constants/theme';

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
  const contentWidth = Math.min(width, MaxContentWidth * (breakpoint === 'tablet' ? 1.5 : 1));
  const columns = breakpoint === 'tablet' ? (width > 900 ? 4 : 3) : 2;
  const innerWidth = contentWidth - gutter * 2;

  const cardWidth = (cols: number = columns, gap: number = Spacing.three) => Math.floor((innerWidth - gap * (cols - 1)) / cols);
  const carouselCardWidth = breakpoint === 'tablet' ? 240 : Math.round(Math.min(220, Math.max(148, innerWidth * 0.46)));

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
