/**
 * Paleta de ArtRider — portada desde app/globals.css (art-rider web).
 * Modo claro: tokens shadcn de la web (fondo blanco, texto oscuro).
 * Modo oscuro: tokens de marca reales de ArtRider (surface-1/2/3 violeta oscuro).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111111',
    textSecondary: '#4b5563', // 7.5:1 sobre blanco
    textMuted: '#5b6472', // ≥ 5:1 sobre blanco y ≥ 4.5:1 sobre superficies tenues — antes #9ca3af (2.5:1)
    background: '#ffffff',
    backgroundElement: '#f5f5f5',
    backgroundSelected: '#e5e7eb',
    primary: '#875b9a', // primary-500 de la web: único acento de marca
    primaryLight: '#a97dc4', // primary-400
    primaryDark: '#6a437a', // primary-600 (estado presionado)
    onPrimary: '#ffffff', // 5.4:1 sobre primary
    primarySoft: '#f1eaf5', // fondo tenue del acento (chips/íconos)
    border: '#e5e7eb',
    destructive: '#c81e1e', // ≥ 5.5:1 sobre blanco y sobre destructiveSoft
    destructiveSoft: '#fef2f2', // fondo de avisos de error
    scrim: 'rgba(17, 17, 17, 0.5)',
    onImage: '#ffffff', // texto/íconos sobre fotos
    imageBackdrop: '#f4f4f6', // fondo neutro claro bajo fotos de producto (también en oscuro)
    onImageSurface: 'rgba(17, 17, 17, 0.55)', // botón circular sobre foto
  },
  dark: {
    text: '#f0eef5', // text-primary
    textSecondary: '#c3b8d1',
    textMuted: '#9a8fae', // 5.9:1 sobre surface-1
    background: '#16141e', // surface-1
    backgroundElement: '#1e1b2a', // surface-2
    backgroundSelected: '#26223a', // surface-3
    primary: '#a97dc4', // primary-400 (más claro, mejor contraste en fondo oscuro)
    primaryLight: '#a97dc4',
    primaryDark: '#875b9a',
    onPrimary: '#16141e', // texto oscuro sobre el acento claro
    primarySoft: 'rgba(169, 125, 196, 0.16)',
    border: 'rgba(135, 91, 154, 0.30)', // border-card
    destructive: '#f87171',
    destructiveSoft: 'rgba(248, 113, 113, 0.15)',
    scrim: 'rgba(0, 0, 0, 0.6)',
    onImage: '#ffffff',
    imageBackdrop: '#f4f4f6',
    onImageSurface: 'rgba(0, 0, 0, 0.55)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Colores de estado de reserva (pendiente/confirmada/cancelada/completada) —
 * unificados desde el rediseño de Claude Design. Antes cada pantalla
 * (BookingListCard, OrderGroupCard, ProviderTodayScreen, calendario del
 * proveedor) traía su propio Record<Status, {bg, text}> hardcodeado en hex
 * claro fijo, así que en modo oscuro las píldoras de estado no cambiaban
 * y quedaban con bajo contraste.
 */
export type BookingStatusKey = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export const StatusColors: Record<'light' | 'dark', Record<BookingStatusKey, { bg: string; fg: string }>> = {
  // Modo oscuro: fondos translúcidos con texto claro (antes pastillas pastel que brillaban).
  dark: {
    pending: { bg: 'rgba(251, 191, 36, 0.16)', fg: '#FCD34D' },
    confirmed: { bg: 'rgba(74, 222, 128, 0.16)', fg: '#86EFAC' },
    cancelled: { bg: 'rgba(248, 113, 113, 0.16)', fg: '#FCA5A5' },
    completed: { bg: 'rgba(255, 255, 255, 0.10)', fg: '#C3B8D1' },
  },
  light: {
    pending: { bg: '#FDF2DF', fg: '#A06A0C' },
    confirmed: { bg: '#E6F6ED', fg: '#157A45' },
    cancelled: { bg: '#FDEAEC', fg: '#BD2C45' },
    completed: { bg: '#EDEBF0', fg: '#5B5567' },
  },
};

/** Etiquetas legibles por estado real del backend (bookingsService/providerService). */
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  AWAITING_SIGNATURES: 'Pendiente',
  PAID: 'Activa',
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
  DISPUTE: 'En disputa',
  CANCELLED: 'Cancelada',
  ARCHIVED: 'Archivada',
};


/** Colapsa los 7 estados de bookingsService a las 4 llaves visuales de StatusColors. */
export function toStatusKey(status: string): BookingStatusKey {
  switch (status) {
    case 'AWAITING_SIGNATURES':
      return 'pending';
    case 'PAID':
    case 'ACTIVE':
      return 'confirmed';
    case 'CANCELLED':
    case 'DISPUTE':
      return 'cancelled';
    default:
      return 'completed'; // COMPLETED, ARCHIVED
  }
}

export const Fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: Platform.select({
    ios: 'ui-monospace',
    android: 'monospace',
    default: 'monospace',
  }) as string,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  snug: 12, // paddings internos de tarjetas y campos
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Radio de borde base — portado de --radius: 0.625rem (~10px) de la web. */
export const Radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  card: 16, // tarjetas e imágenes
  sheet: 24, // bottom sheets y modales
  full: 999, // píldoras
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ─────────────────────────────────────────────────────────────────────────
// Sistema de diseño (único módulo de tokens). Cuadrícula de 8: usar Spacing.
// ─────────────────────────────────────────────────────────────────────────

/** Acento del corazón de favoritos: primary-400, legible sobre el botón translúcido en ambos modos. */
export const FavoriteAccent = '#a97dc4';

/** Alto de los campos de formulario (48–52pt: cómodos para el pulgar). */
export const FieldHeight = 52;

/** Alto de las filas de menú/ajustes (íconos alineados, chevron al margen). */
export const RowHeight = 56;

/** Objetivo táctil mínimo (Apple HIG / Material): 44pt. */
export const MinTouch = 44;

/**
 * Margen horizontal de pantalla: 16 en teléfono (< 600) y 24 en ≥ 600. El MISMO a izquierda y
 * derecha en todas las pantallas (aplicado por Screen/useLayout, no por cada pantalla).
 */
export const Gutter = { compact: 16, regular: 16, tablet: 24 } as const;

/** Ritmo vertical (cuadrícula 4/8) compartido por todas las pantallas. */
export const Rhythm = {
  /** Separación entre secciones. */
  section: 32,
  /** Título (o subtítulo) de sección → su contenido. */
  titleToContent: 12,
  /** Chips de filtro → primera sección. */
  chipsToSection: 24,
  /** Padding interno de tarjetas. */
  cardPadding: 12,
  /** Separación entre tarjetas (carruseles y grillas). */
  cardGap: 12,
} as const;

/** Miniatura cuadrada común de las filas de lista (reservas, carrito, mensajes). */
export const Thumb = { list: 64, compact: 48 } as const;

/** Breakpoints de ancho: compact < 360 ≤ regular ≤ 600 < tablet. */
export const Breakpoints = { compactMax: 360, tabletMin: 600 } as const;

/** Escala tipográfica única (Inter). Reemplaza fontSize sueltos. */
export type TypeVariant =
  | 'display'
  | 'title'
  | 'headline'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'captionStrong'
  | 'overline'
  | 'button';

export const Type: Record<
  TypeVariant,
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number; textTransform?: 'uppercase' }
> = {
  // lineHeight ≈ 1.2–1.35 × fontSize (antes hasta 1.47×).
  display: { fontFamily: Fonts.sansBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: Fonts.sansBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  headline: { fontFamily: Fonts.sansBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  subtitle: { fontFamily: Fonts.sansSemiBold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 20 },
  bodyStrong: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 17 },
  captionStrong: { fontFamily: Fonts.sansSemiBold, fontSize: 13, lineHeight: 17 },
  overline: { fontFamily: Fonts.sansBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  button: { fontFamily: Fonts.sansSemiBold, fontSize: 16, lineHeight: 20 },
};

/** Sombras muy suaves (en oscuro se sustituyen por borde). */
export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

/** Relaciones de aspecto únicas para imágenes. */
export const Aspect = { card: 4 / 3, hero: 16 / 10, square: 1 } as const;
