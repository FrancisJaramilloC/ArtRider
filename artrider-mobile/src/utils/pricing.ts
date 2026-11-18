/**
 * Comisión de servicio de ArtRider: única fuente del cálculo (carrito, resúmenes de checkout y Ganancias del Partner).
 * Importes siempre en centavos.
 */
export const SERVICE_FEE_RATE = 0.05;

/** Comisión que paga el Rider sobre el subtotal de equipos (se suma al subtotal: total = subtotal + comisión). */
export function computeServiceFee(subtotalCents: number): number {
  return Math.ceil(subtotalCents * SERVICE_FEE_RATE);
}

export type BookingAmounts = {
  /** Lo que pagó el Rider por la reserva (subtotal + comisión): `bookings.total_price`. */
  gross: number;
  /** Comisión de servicio incluida en el bruto. */
  fee: number;
  /** Subtotal de equipos: lo que corresponde al Partner (bruto − comisión). */
  net: number;
};

/**
 * Descompone el total de una reserva en subtotal y comisión con la MISMA función de comisión del checkout:
 * busca el subtotal `s` tal que `s + computeServiceFee(s) === total`. Si no existe una solución exacta (p. ej. la comisión
 * de un pedido con varios Partners se reparte proporcionalmente y puede variar unos centavos) usa la mejor estimación.
 */
export function splitBookingTotal(totalCents: number): BookingAmounts {
  const gross = Math.max(0, Math.round(totalCents));
  const estimate = Math.round(gross / (1 + SERVICE_FEE_RATE));
  for (const delta of [0, -1, 1, -2, 2]) {
    const net = estimate + delta;
    if (net >= 0 && net + computeServiceFee(net) === gross) return { gross, fee: gross - net, net };
  }
  return { gross, fee: gross - estimate, net: estimate };
}
