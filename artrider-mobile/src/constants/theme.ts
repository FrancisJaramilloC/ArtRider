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
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    background: '#ffffff',
    backgroundElement: '#f5f5f5',
    backgroundSelected: '#e5e7eb',
    primary: '#875b9a', // primary-500 de la web
    primaryLight: '#a97dc4', // primary-400
    primaryDark: '#6a437a', // primary-600
    border: '#e5e7eb',
    destructive: '#ef4444',
  },
  dark: {
    text: '#f0eef5', // text-primary
    textSecondary: '#a89bb8', // text-secondary
    textMuted: '#6b6080', // text-muted
    background: '#16141e', // surface-1
    backgroundElement: '#1e1b2a', // surface-2
    backgroundSelected: '#26223a', // surface-3
    primary: '#a97dc4', // primary-400 (más claro, mejor contraste en fondo oscuro)
    primaryLight: '#a97dc4',
    primaryDark: '#6a437a',
    border: 'rgba(135, 91, 154, 0.30)', // border-card
    destructive: '#f87171',
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
  dark: {
    pending: { bg: '#FEF3C7', fg: '#92400E' },
    confirmed: { bg: '#DCFCE7', fg: '#166534' },
    cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
    completed: { bg: '#F3F4F6', fg: '#4B5563' },
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

/** Gradientes de marca reutilizables (avatares, chips activos, CTAs). */
export const Gradients = {
  brand: ['#A97DC4', '#6A437A'] as [string, string],
  chipActive: ['#A97DC4', '#875B9A'] as [string, string],
  package: ['#7C3AED', '#D61F9E'] as [string, string],
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
  full: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;