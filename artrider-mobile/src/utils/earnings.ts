import type { ProviderBooking } from '@/services/providerService';
import { MONTHS_ES_LONG } from './calendar';
import { breakdownOf, estimatePartnerAmount, type PricingRates } from './pricing';

/** Solo lectura: lo que ve el Partner de sus reservas. No mueve dinero ni toca la base de datos. */
export type EarningStatus = 'pending' | 'paid';
export type EarningFilter = 'all' | EarningStatus;

export type EarningRow = {
  /** Lo que pagó el Rider (total de la reserva). */
  gross: number;
  /** Lo que se queda ArtRider: comisión + tarifa de servicio + redondeo (bruto − neto). */
  fee: number;
  /** Lo que gana el Partner: SIEMPRE su precio. */
  net: number;
  /** Comisión de ArtRider sobre el precio del Partner y tarifa de servicio al Rider, cuando la reserva trae el desglose exacto. */
  commission: number | null;
  serviceFee: number | null;
  /** true si el neto es una estimación (la reserva no trae el desglose guardado). */
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
 * Estados de reserva que cuentan como ganancia (supuesto: no hay un estado de «cobrado» en los datos de la reserva):
 * - pendiente: aún no se completa el servicio (por aceptar, pagada o en curso);
 * - pagada: servicio completado (o archivado, que se archiva tras completarse).
 * CANCELLED y DISPUTE no suman.
 */
const PENDING_STATUSES = new Set(['AWAITING_SIGNATURES', 'PAID', 'ACTIVE']);
const PAID_STATUSES = new Set(['COMPLETED', 'ARCHIVED']);

export function toEarningRows(bookings: ProviderBooking[], rates: PricingRates): EarningRow[] {
  const rows: EarningRow[] = [];
  for (const b of bookings) {
    const status: EarningStatus | null = PAID_STATUSES.has(b.status) ? 'paid' : PENDING_STATUSES.has(b.status) ? 'pending' : null;
    if (!status) continue;
    // Monto exacto guardado en la reserva si existe; si no (reservas anteriores), estimación con las tasas actuales.
    const exact = typeof b.partner_amount === 'number';
    const partnerAmount = exact ? (b.partner_amount as number) : estimatePartnerAmount(b.total_price, rates);
    const breakdown = breakdownOf(partnerAmount, b.total_price);
    const riderSubtotal = typeof b.rider_subtotal === 'number' ? b.rider_subtotal : null;
    rows.push({
      gross: breakdown.total,
      fee: breakdown.platformRevenue,
      net: breakdown.partnerAmount,
      commission: exact && riderSubtotal !== null ? riderSubtotal - partnerAmount : null,
      serviceFee: exact && riderSubtotal !== null ? b.total_price - riderSubtotal : null,
      estimated: !exact,
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
  /** Neto de las reservas pagadas cuyo evento cae en el mes elegido. */
  monthNet: number;
  /** Neto de todo lo pendiente (sin importar el mes). */
  pendingNet: number;
  /** Neto de todo lo pagado, histórico. */
  totalNet: number;
};

export function summarize(rows: EarningRow[], monthKey: string): EarningsSummary {
  let monthNet = 0;
  let pendingNet = 0;
  let totalNet = 0;
  for (const row of rows) {
    if (row.status === 'pending') pendingNet += row.net;
    else {
      totalNet += row.net;
      if (monthKeyOf(row.startDate) === monthKey) monthNet += row.net;
    }
  }
  return { monthNet, pendingNet, totalNet };
}

/** Reservas del mes (por fecha del evento), filtradas, la más reciente primero. */
export function rowsOfMonth(rows: EarningRow[], monthKey: string, filter: EarningFilter): EarningRow[] {
  return rows
    .filter((row) => monthKeyOf(row.startDate) === monthKey && (filter === 'all' || row.status === filter))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}
