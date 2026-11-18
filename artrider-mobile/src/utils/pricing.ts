/**
 * Precios de ArtRider: ÚNICA implementación (Rider, carrito, checkout, Ganancias). Importes en centavos; las tasas se
 * reciben por parámetro (viven en la tabla `pricing_settings` de Supabase y se leen con `usePricing()`).
 *
 * Modelo:
 * - El Partner fija SU precio por día (lo que él gana). Solo ese valor se guarda en el equipo/paquete.
 * - Precio por día del Rider = ceil(precio_partner × (1 + comisión_partner)). Sin redondeo al .99. (80 → 92.00)
 * - Subtotal del carrito = Σ (precio del Rider × días × cantidad).
 * - Total = redondeo .99 de ceil(subtotal × (1 + tarifa_servicio)), una sola vez sobre el carrito completo.
 * - Tarifa de servicio mostrada = total − subtotal (las líneas siempre cuadran al centavo).
 * - El Partner recibe exactamente su precio; ArtRider se queda con total − precio del Partner (absorbe el redondeo).
 *
 * Los productos con tasas se calculan con enteros (partes por millón), no con decimales de coma flotante, para evitar
 * errores como 12340 × 1.15 = 14191.000000000002 → 14192.
 */

export type PricingRates = {
  /** Comisión de ArtRider sobre el precio del Partner (0.15 = 15 %). */
  partnerCommissionRate: number;
  /** Tarifa de servicio al Rider sobre el subtotal (0.05 = 5 %). */
  serviceFeeRate: number;
};

/** Respaldo cuando la configuración no se puede leer. */
export const DEFAULT_PRICING_RATES: PricingRates = { partnerCommissionRate: 0.15, serviceFeeRate: 0.05 };

const RATE_SCALE = 1_000_000;

/** Tasa válida (0 a 1); si no, el respaldo. */
function validRate(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

/** Normaliza una configuración leída de la base: valores inválidos o ausentes usan el respaldo. */
export function sanitizeRates(raw: { partnerCommissionRate?: unknown; serviceFeeRate?: unknown } | null | undefined): PricingRates {
  return {
    partnerCommissionRate: validRate(raw?.partnerCommissionRate, DEFAULT_PRICING_RATES.partnerCommissionRate),
    serviceFeeRate: validRate(raw?.serviceFeeRate, DEFAULT_PRICING_RATES.serviceFeeRate),
  };
}

/** ceil(cents × (1 + rate)) con aritmética entera. */
function ceilWithRate(cents: number, rate: number): number {
  const factor = RATE_SCALE + Math.round(rate * RATE_SCALE);
  return Math.floor((cents * factor + RATE_SCALE - 1) / RATE_SCALE);
}

/** Precio por día que ve el Rider: ceil(precio del Partner × (1 + comisión)), en centavos. 8000 → 9200. */
export function riderDailyPrice(partnerDailyCents: number, rates: PricingRates): number {
  if (!Number.isFinite(partnerDailyCents) || partnerDailyCents <= 0) return 0;
  return ceilWithRate(Math.round(partnerDailyCents), rates.partnerCommissionRate);
}

/**
 * Redondeo al .99 más cercano (empates hacia arriba): n = round((cents + 1) / 100) × 100 − 1.
 * Si el resultado sería menor a $1 se usa el valor exacto. 9240 → 9199 · 9251 → 9299 · 9250 → 9299 · 9660 → 9699.
 */
export function roundTo99(cents: number): number {
  const rounded = Math.floor((cents + 1 + 50) / 100) * 100 - 1;
  return rounded < 100 ? cents : rounded;
}

export type CartTotals = {
  /** Σ (precio del Rider × días × cantidad). */
  subtotal: number;
  /** Tarifa de servicio mostrada = total − subtotal. */
  serviceFee: number;
  /** Total a pagar (redondeado al .99 una sola vez). */
  total: number;
};

/** Total del carrito completo a partir de su subtotal. Nunca se redondea por línea. 9200 → { 9200, 499, 9699 }. */
export function computeCartTotals(subtotalCents: number, rates: PricingRates): CartTotals {
  const subtotal = Math.max(0, Math.round(subtotalCents));
  // El redondeo al .99 puede quedar por debajo del subtotal en carritos muy pequeños (< ~$10): la tarifa nunca es negativa.
  const total = Math.max(subtotal, roundTo99(ceilWithRate(subtotal, rates.serviceFeeRate)));
  return { subtotal, serviceFee: total - subtotal, total };
}

/** Línea del carrito: precio del Rider por día × días × cantidad. */
export function riderLineTotal(riderDailyCents: number, days: number, quantity: number): number {
  return riderDailyCents * days * quantity;
}

/** Desglose guardado/mostrado de una reserva. Todo en centavos. */
export type BookingBreakdown = {
  /** Lo que gana el Partner (su precio × días × cantidad). */
  partnerAmount: number;
  /** Total que pagó el Rider. */
  total: number;
  /** Lo que se queda ArtRider: total − partnerAmount (comisión + tarifa de servicio + redondeo). */
  platformRevenue: number;
};

/** Desglose a partir de los dos montos exactos. */
export function breakdownOf(partnerAmount: number, total: number): BookingBreakdown {
  return { partnerAmount, total, platformRevenue: total - partnerAmount };
}

/**
 * Estimación del monto del Partner cuando una reserva no trae el desglose guardado (reservas anteriores al nuevo
 * modelo): total ÷ ((1 + comisión) × (1 + tarifa)). Es aproximado (±$0.50 por el redondeo .99); las reservas nuevas
 * guardan el monto exacto y no usan esta función.
 */
export function estimatePartnerAmount(totalCents: number, rates: PricingRates): number {
  const factor = (RATE_SCALE + Math.round(rates.partnerCommissionRate * RATE_SCALE)) * (RATE_SCALE + Math.round(rates.serviceFeeRate * RATE_SCALE));
  return Math.max(0, Math.round((totalCents * RATE_SCALE * RATE_SCALE) / factor));
}
