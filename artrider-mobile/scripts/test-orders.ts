// Pruebas de los pedidos del carrito del Rider: estado del grupo, reembolso y neto. Ejecutar: pnpm test:orders
import assert from 'node:assert/strict';

import { lineRefund, orderGroupStatus, orderListSummary, orderRefundSummary } from '../src/utils/orders.ts';

let checks = 0;
function eq<T>(actual: T, expected: T, label: string) {
  assert.deepEqual(actual, expected, label);
  checks += 1;
}

// Estado del grupo
eq(orderGroupStatus(['CANCELLED', 'CANCELLED']), 'cancelled', 'todas canceladas');
eq(orderGroupStatus(['CANCELLED']), 'cancelled', 'una sola, cancelada');
eq(orderGroupStatus(['AWAITING_SIGNATURES', 'AWAITING_SIGNATURES']), 'pending', 'todas pendientes');
eq(orderGroupStatus(['AWAITING_SIGNATURES', 'ACTIVE']), 'pending', 'pendiente gana a confirmada');
eq(orderGroupStatus(['AWAITING_SIGNATURES', 'CANCELLED']), 'pending', 'pendiente con una cancelada');
eq(orderGroupStatus(['PAID', 'ACTIVE']), 'confirmed', 'confirmadas');
eq(orderGroupStatus(['ACTIVE', 'CANCELLED']), 'confirmed', 'confirmada con una cancelada');
eq(orderGroupStatus(['PAID', 'COMPLETED']), 'confirmed', 'activa con otra completada sigue confirmada');
eq(orderGroupStatus(['COMPLETED', 'COMPLETED']), 'completed', 'todas completadas');
eq(orderGroupStatus(['COMPLETED', 'CANCELLED']), 'completed', 'completada con una cancelada');
eq(orderGroupStatus(['DISPUTE', 'COMPLETED']), 'dispute', 'con disputa');
eq(orderGroupStatus(['ARCHIVED']), 'other', 'archivada');
eq(orderGroupStatus([]), 'other', 'sin líneas');

// Reembolso por línea: solo canceladas y solo si hubo cobro
eq(lineRefund({ status: 'CANCELLED', total_price: 5000 }, true), 5000, 'cancelada con cobro');
eq(lineRefund({ status: 'CANCELLED', total_price: 5000 }, false), 0, 'cancelada sin ticket: no hay reembolso');
eq(lineRefund({ status: 'AWAITING_SIGNATURES', total_price: 5000 }, true), 0, 'pendiente: no se reembolsa');
eq(lineRefund({ status: 'ACTIVE', total_price: 5000 }, true), 0, 'activa: no se reembolsa');

// Reembolso y neto del pedido: el total pagado no cambia
const lines = [
  { status: 'CANCELLED', total_price: 5250 },
  { status: 'AWAITING_SIGNATURES', total_price: 10500 },
  { status: 'ACTIVE', total_price: 3150 },
];
eq(orderRefundSummary(lines, 18900, true), { refunded: 5250, net: 13650 }, 'una línea cancelada');
eq(orderRefundSummary(lines, 18900, false), { refunded: 0, net: 18900 }, 'sin ticket: nada que reembolsar');
eq(orderRefundSummary([{ status: 'CANCELLED', total_price: 1000 }, { status: 'CANCELLED', total_price: 2000 }], 3000, true), { refunded: 3000, net: 0 }, 'todas canceladas: neto 0');
eq(orderRefundSummary([{ status: 'ACTIVE', total_price: 1000 }], 1000, true), { refunded: 0, net: 1000 }, 'sin canceladas');
eq(orderRefundSummary([{ status: 'CANCELLED', total_price: 4000 }], 3000, true).net, 0, 'el neto nunca es negativo');
const sumRefundNet = orderRefundSummary(lines, 18900, true);
eq(sumRefundNet.refunded + sumRefundNet.net, 18900, 'reembolsado + neto = total pagado');

// Lista de Reservas: neto sin canceladas
eq(orderListSummary(lines), { net: 13650, cancelledCount: 1, count: 3 }, 'lista: neto sin la cancelada');
eq(orderListSummary([{ status: 'CANCELLED', total_price: 100 }]), { net: 0, cancelledCount: 1, count: 1 }, 'lista: todas canceladas');
eq(orderListSummary([{ status: 'ACTIVE', total_price: 100 }, { status: 'COMPLETED', total_price: 200 }]), { net: 300, cancelledCount: 0, count: 2 }, 'lista: sin canceladas');

console.log(`OK: ${checks} comprobaciones de pedidos del Rider`);
