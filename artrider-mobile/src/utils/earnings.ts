import type { ProviderBooking } from '@/services/providerService';
import { MONTHS_ES_LONG } from './calendar';
import { formatPrice } from './format';
import { resolvePartnerAmount } from './pricing';

/**
 * Solo lectura: lo que ve el Partner de sus reservas, SIEMPRE en lo que él gana (partner_amount). Nunca el total del
 * Rider, la comisión ni la tarifa de servicio. No mueve dinero ni toca la base de datos.
 */
export type EarningStatus = 'earned' | 'toCollect' | 'awaiting';
export type EarningFilter = 'all' | EarningStatus;

export type EarningRow = {
  /** Lo que gana el Partner: SIEMPRE su precio. */
  net: number;
  /** true si el neto es una estimación (reserva anterior al nuevo modelo, sin monto guardado). */
  estimated: boolean;
  id: string;
  title: string;
  client: string | null;
  /** Fecha del evento (inicio de la reserva, YYYY-MM-DD). */
  startDate: string;
  endDate: string;
  status: EarningStatus;
};

/**
 * Estado de la ganancia según el estado de la reserva:
 * - earned: COMPLETED (servicio terminado);
 * - toCollect: ACTIVE o PAID (aceptada, aún no se completa);
 * - awaiting: AWAITING_SIGNATURES (pendiente de tu respuesta).
 * CANCELLED, DISPUTE y ARCHIVED no suman.
 */
export function earningStatusOf(bookingStatus: ProviderBooking['status']): EarningStatus | null {
  switch (bookingStatus) {
    case 'COMPLETED':
      return 'earned';
    case 'ACTIVE':
    case 'PAID':
      return 'toCollect';
    case 'AWAITING_SIGNATURES':
      return 'awaiting';
    default:
      return null;
  }
}

export function toEarningRows(bookings: ProviderBooking[]): EarningRow[] {
  const rows: EarningRow[] = [];
  for (const b of bookings) {
    const status = earningStatusOf(b.status);
    if (!status) continue;
    // Monto exacto guardado en la reserva; si es NULL (reservas del modelo anterior) se estima total ÷ 1.05 y se marca «aprox.».
    const { amount, estimated } = resolvePartnerAmount(b.partner_amount, b.total_price);
    rows.push({
      net: amount,
      estimated,
      id: b.booking_id,
      title: b.listing_title ?? 'Item reservado',
      client: b.client_name,
      startDate: b.start_date.slice(0, 10),
      endDate: b.end_date.slice(0, 10),
      status,
    });
  }
  return rows;
}

/** «2026-11» del mes de un día (fecha local). */
export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Mes anterior (−1) o siguiente (+1) de una clave «YYYY-MM». */
export function shiftMonthKey(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** «Noviembre 2026». */
export function monthKeyLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const name = MONTHS_ES_LONG[month - 1] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export type EarningsSummary = {
  /** Ganado: reservas COMPLETED cuyo evento cae en el mes elegido. */
  monthNet: number;
  /** Por cobrar: reservas aceptadas (ACTIVE/PAID), sin importar el mes. */
  toCollectNet: number;
  /** Pendiente de tu respuesta (AWAITING_SIGNATURES), sin importar el mes. */
  awaitingNet: number;
  /** Ganado histórico (todas las COMPLETED). */
  totalNet: number;
};

export function summarize(rows: EarningRow[], monthKey: string): EarningsSummary {
  let monthNet = 0;
  let toCollectNet = 0;
  let awaitingNet = 0;
  let totalNet = 0;
  for (const row of rows) {
    if (row.status === 'awaiting') awaitingNet += row.net;
    else if (row.status === 'toCollect') toCollectNet += row.net;
    else {
      totalNet += row.net;
      if (monthKeyOf(row.startDate) === monthKey) monthNet += row.net;
    }
  }
  return { monthNet, toCollectNet, awaitingNet, totalNet };
}

/** Reservas del mes (por fecha del evento), filtradas, la más reciente primero. */
export function rowsOfMonth(rows: EarningRow[], monthKey: string, filter: EarningFilter): EarningRow[] {
  return rows
    .filter((row) => monthKeyOf(row.startDate) === monthKey && (filter === 'all' || row.status === filter))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * Lo que gana el Partner en una reserva, para tarjetas y detalle: «Ganarás $X», «Ganaste $X» (completada) o null si la
 * reserva ya no cuenta (cancelada/disputa). Con monto estimado (reserva anterior al nuevo modelo) añade «(aprox.)».
 */
export function earningsLabel(booking: ProviderBooking): string | null {
  const status = earningStatusOf(booking.status);
  if (!status) return null;
  const { amount, estimated } = resolvePartnerAmount(booking.partner_amount, booking.total_price);
  return `${status === 'earned' ? 'Ganaste' : 'Ganarás'} ${formatPrice(amount)}${estimated ? ' (aprox.)' : ''}`;
}
