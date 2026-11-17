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


/** Reservas vigentes (no canceladas ni archivadas) que ocupan cada día del rango [inicio, fin]. */
export function bookingsByDay(bookings: ProviderBooking[]): Map<string, ProviderBooking[]> {
  const map = new Map<string, ProviderBooking[]>();
  for (const b of bookings) {
    if (b.status === 'CANCELLED' || b.status === 'ARCHIVED') continue;
    const start = parseDay(b.start_date).getTime();
    const end = parseDay(b.end_date).getTime();
    for (let t = start; t <= end; t += DAY_MS) {
      const key = new Date(t).toISOString().slice(0, 10);
      const list = map.get(key);
      if (list) list.push(b);
      else map.set(key, [b]);
    }
  }
  return map;
}

/** Reservas próximas o en curso (aún no terminadas) por equipo: para la insignia «N reservas próximas». */
export function upcomingCountByListing(bookings: ProviderBooking[], now: Date = new Date()): Record<string, number> {
  const today = todayKey(now);
  const counts: Record<string, number> = {};
  for (const b of bookings) {
    if (!b.listing_id) continue;
    if (b.status === 'CANCELLED' || b.status === 'ARCHIVED' || b.status === 'COMPLETED' || b.status === 'DISPUTE') continue;
    if (b.end_date.slice(0, 10) < today) continue;
    counts[b.listing_id] = (counts[b.listing_id] ?? 0) + 1;
  }
  return counts;
}

/** Próximas reservas (vigentes, aún no terminadas) ordenadas por fecha de inicio. */
export function upcomingBookings(bookings: ProviderBooking[], now: Date = new Date()): ProviderBooking[] {
  const today = todayKey(now);
  return bookings
    .filter((b) => b.status !== 'CANCELLED' && b.status !== 'ARCHIVED' && b.status !== 'COMPLETED' && b.status !== 'DISPUTE' && b.end_date.slice(0, 10) >= today)
    .sort((x, y) => x.start_date.localeCompare(y.start_date));
}
