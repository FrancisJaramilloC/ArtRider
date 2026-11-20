// Lógica pura de los pedidos del carrito del Rider (varias reservas con el mismo order_id): estado del grupo, reembolso y neto.
// Sin red ni React: se prueba con `pnpm test:orders`. Importes en centavos.

export type OrderGroupStatus = 'cancelled' | 'pending' | 'confirmed' | 'completed' | 'dispute' | 'other';

/**
 * Estado del grupo a partir de los estados de sus reservas, por prioridad:
 * todas canceladas → cancelled · alguna AWAITING_SIGNATURES → pending · alguna PAID/ACTIVE → confirmed ·
 * alguna DISPUTE → dispute · todas COMPLETED o CANCELLED con alguna COMPLETED → completed · otro caso → other.
 */
export function orderGroupStatus(statuses: readonly string[]): OrderGroupStatus {
  if (statuses.length === 0) return 'other';
  if (statuses.every((s) => s === 'CANCELLED')) return 'cancelled';
  if (statuses.some((s) => s === 'AWAITING_SIGNATURES')) return 'pending';
  if (statuses.some((s) => s === 'PAID' || s === 'ACTIVE')) return 'confirmed';
  if (statuses.some((s) => s === 'DISPUTE')) return 'dispute';
  if (statuses.every((s) => s === 'COMPLETED' || s === 'CANCELLED') && statuses.some((s) => s === 'COMPLETED')) return 'completed';
  return 'other';
}

type Line = { status: string; total_price: number };

/** ¿Esta línea se reembolsa? Solo si está cancelada y el pedido se cobró (tiene ticket de Kushki). */
export function lineRefund(line: Line, charged: boolean): number {
  return charged && line.status === 'CANCELLED' ? line.total_price : 0;
}

/**
 * Reembolso y neto de un pedido. El «Total pagado» (`orderTotal`) nunca cambia; el reembolso es la suma de las líneas canceladas
 * (cada una se reembolsa por su propio total en Kushki) y el neto es lo que queda pagado.
 */
export function orderRefundSummary(lines: readonly Line[], orderTotal: number, charged: boolean): { refunded: number; net: number } {
  const refunded = lines.reduce((sum, l) => sum + lineRefund(l, charged), 0);
  return { refunded, net: Math.max(0, orderTotal - refunded) };
}

/** Para la lista de Reservas: neto (sin las líneas canceladas) y cuántas están canceladas. */
export function orderListSummary(lines: readonly Line[]): { net: number; cancelledCount: number; count: number } {
  const active = lines.filter((l) => l.status !== 'CANCELLED');
  return { net: active.reduce((sum, l) => sum + l.total_price, 0), cancelledCount: lines.length - active.length, count: lines.length };
}
