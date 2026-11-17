import type { ProviderBooking } from '@/services/providerService';

/** Segmentos de la lista de reservas del proveedor (agrupan los estados existentes; no crean estados nuevos). */
export type BookingSegment = 'pending' | 'upcoming' | 'inProgress' | 'history';

export const SEGMENT_OPTIONS: { value: BookingSegment; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'upcoming', label: 'Próximas' },
  { value: 'inProgress', label: 'En curso' },
  { value: 'history', label: 'Historial' },
];

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAY_MS = 86_400_000;

export function isBookingSegment(value: unknown): value is BookingSegment {
  return value === 'pending' || value === 'upcoming' || value === 'inProgress' || value === 'history';
}

/** «2026-11-16» → fecha UTC (evita el desfase por zona horaria). */
function parseDay(dateStr: string): Date {
  return new Date(dateStr.slice(0, 10) + 'T00:00:00Z');
}

function todayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A qué segmento pertenece una reserva. PAID → próxima; ACTIVE → en curso (o próxima si aún no empieza). */
export function segmentOf(booking: ProviderBooking, now: Date = new Date()): BookingSegment {
  switch (booking.status) {
    case 'AWAITING_SIGNATURES':
      return 'pending';
    case 'PAID':
      return 'upcoming';
    case 'ACTIVE':
      return booking.start_date.slice(0, 10) > todayKey(now) ? 'upcoming' : 'inProgress';
    default:
      return 'history';
  }
}

/** «30 oct – 2 nov» (o «30 oct» si es un solo día). Si cruza de año, añade el año de cada extremo. */
export function formatDateRange(start: string, end: string): string {
  const a = parseDay(start);
  const b = parseDay(end);
  const fmt = (d: Date, withYear: boolean) =>
    `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ''}`;
  if (a.getTime() === b.getTime()) return fmt(a, false);
  const crossYear = a.getUTCFullYear() !== b.getUTCFullYear();
  return `${fmt(a, crossYear)} – ${fmt(b, crossYear)}`;
}

/** Noches/días del alquiler (inclusivo, igual que el cobro: días = fin − inicio + 1). */
export function rentalDays(start: string, end: string): number {
  return Math.max(1, Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / DAY_MS) + 1);
}
