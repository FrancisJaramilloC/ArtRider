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