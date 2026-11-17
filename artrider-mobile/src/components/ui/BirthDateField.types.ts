import type { RefObject } from 'react';

import type { FieldViewInstance } from '@/hooks/useForm';

export type BirthDateFieldProps = {
  /** Fecha elegida como YYYY-MM-DD (vacía si no hay). */
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
  error: string | null;
  /** Referencia de vista para que el formulario pueda desplazarse hasta el campo con error. */
  viewRef: RefObject<FieldViewInstance | null>;
};

/** Primer año seleccionable y fecha inicial sugerida del selector. */
export const DEFAULT_PICKER_DATE = new Date(2000, 0, 1);

export function parseDateKey(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}
