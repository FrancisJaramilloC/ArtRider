// Pruebas de las reservas del Partner (segmentos por fecha en Ecuador). Ejecutar: pnpm test:partner
import assert from 'node:assert/strict';

import { earningsLabel, rowsOfMonth, summarize, toEarningRows } from '../src/utils/earnings.ts';
import { ecuadorTodayKey, nextAcceptedBooking, segmentOf, upcomingBookings } from '../src/utils/providerBookings.ts';

let checks = 0;
function eq<T>(actual: T, expected: T, label: string) {
  assert.deepEqual(actual, expected, label);
  checks += 1;
}

type B = Parameters<typeof segmentOf>[0];
const booking = (status: B['status'], start: string, end: string, id = 'b'): B =>
  ({ booking_id: id, status, start_date: start, end_date: end, total_price: 0, created_at: '', listing_title: null, listing_cover_image_url: null, client_name: null, client_phone: null, order_id: null, already_reviewed: false, listing_id: null }) as B;

// «Hoy» se mide en Ecuador (UTC−5), no en la zona del teléfono.
eq(ecuadorTodayKey(new Date('2026-11-18T04:59:00Z')), '2026-11-17', '23:59 en Ecuador sigue siendo el día anterior');
eq(ecuadorTodayKey(new Date('2026-11-18T05:00:00Z')), '2026-11-18', '00:00 en Ecuador ya es el día nuevo');
eq(ecuadorTodayKey(new Date('2026-12-31T23:30:00Z')), '2026-12-31', 'fin de año');

const noon = new Date('2026-11-18T17:00:00Z'); // 12:00 en Ecuador, 18-nov
eq(segmentOf(booking('AWAITING_SIGNATURES', '2026-11-20', '2026-11-21'), noon), 'pending', 'por responder');
eq(segmentOf(booking('ACTIVE', '2026-11-19', '2026-11-20'), noon), 'upcoming', 'ACTIVE con inicio futuro = próxima');
eq(segmentOf(booking('PAID', '2026-11-19', '2026-11-20'), noon), 'upcoming', 'PAID con inicio futuro = próxima');
eq(segmentOf(booking('ACTIVE', '2026-11-18', '2026-11-20'), noon), 'inProgress', 'hoy es el primer día = en curso');
eq(segmentOf(booking('PAID', '2026-11-16', '2026-11-18'), noon), 'inProgress', 'hoy es el último día = en curso');
eq(segmentOf(booking('PAID', '2026-11-17', '2026-11-19'), noon), 'inProgress', 'PAID dentro del rango = en curso (por fecha, no por estado)');
eq(segmentOf(booking('ACTIVE', '2026-11-10', '2026-11-12'), noon), 'inProgress', 'aceptada vencida sin finalizar sigue visible para «Finalizar»');
eq(segmentOf(booking('COMPLETED', '2026-11-10', '2026-11-12'), noon), 'history', 'completada = historial');
eq(segmentOf(booking('CANCELLED', '2026-11-20', '2026-11-21'), noon), 'history', 'cancelada = historial');
eq(segmentOf(booking('DISPUTE', '2026-11-18', '2026-11-18'), noon), 'history', 'disputa = historial');

// El cambio de día usa Ecuador: 23:30 del 17 en Ecuador (04:30Z del 18) todavía no es «hoy = 18».
const lateNight = new Date('2026-11-18T04:30:00Z');
eq(segmentOf(booking('ACTIVE', '2026-11-18', '2026-11-18'), lateNight), 'upcoming', 'a las 23:30 del 17 la reserva del 18 aún es próxima');

// Dinero del Partner: todo en partner_amount, con respaldo «aprox.» para reservas antiguas (partner_amount NULL)
const money = (status: B['status'], partnerAmount: number | null, total: number, id: string, start = '2026-11-20'): B =>
  ({ ...booking(status, start, start, id), partner_amount: partnerAmount, total_price: total }) as B;
const dinero = [
  money('AWAITING_SIGNATURES', 8000, 9699, 'a'),
  money('ACTIVE', 16000, 19399, 'u1'),
  money('PAID', 8000, 9699, 'u2'),
  money('COMPLETED', 8000, 9699, 'c1', '2026-10-05'),
  money('COMPLETED', null, 8400, 'c2-antigua', '2026-11-02'),
  money('CANCELLED', 8000, 9699, 'x'),
  money('DISPUTE', 8000, 9699, 'd'),
];
const rows = toEarningRows(dinero);
eq(rows.map((r) => r.id), ['a', 'u1', 'u2', 'c1', 'c2-antigua'], 'canceladas y disputas no suman');
eq(summarize(rows), { awaitingNet: 8000, upcomingNet: 24000, toCollectNet: 16000 }, 'pendiente / próximos ingresos / por cobrar (la antigua cuenta 8400 ÷ 1.05 = 8000)');
eq(rows.find((r) => r.id === 'c2-antigua')?.estimated, true, 'reserva antigua marcada aprox.');
eq(rows.find((r) => r.id === 'c1')?.estimated, false, 'reserva nueva exacta');
eq(rowsOfMonth(rows, '2026-11', 'toCollect').map((r) => r.id), ['c2-antigua'], 'filtro Por cobrar del mes');
eq(rowsOfMonth(rows, '2026-11', 'upcoming').map((r) => r.id), ['u1', 'u2'], 'filtro Próximos ingresos del mes');
eq(earningsLabel(money('ACTIVE', 8000, 9699, 'l')), 'Ganarás $80', 'etiqueta futura');
eq(earningsLabel(money('COMPLETED', 8000, 9699, 'l')), 'Ganaste $80', 'etiqueta completada');
eq(earningsLabel(money('COMPLETED', null, 8400, 'l')), 'Ganaste $80 (aprox.)', 'etiqueta aproximada');
eq(earningsLabel(money('CANCELLED', 8000, 9699, 'l')), null, 'cancelada no muestra monto');
assert.ok(!JSON.stringify(rows).includes('9699'), 'el total del Rider nunca llega a las filas del Partner');
checks += 1;

// Próxima reserva aceptada
const list = [
  booking('AWAITING_SIGNATURES', '2026-11-19', '2026-11-19', 'pend'),
  booking('ACTIVE', '2026-11-25', '2026-11-26', 'late'),
  booking('PAID', '2026-11-20', '2026-11-21', 'soon'),
  booking('COMPLETED', '2026-11-18', '2026-11-18', 'done'),
  booking('ACTIVE', '2026-11-01', '2026-11-02', 'past'),
];
eq(nextAcceptedBooking(list, noon)?.booking_id, 'soon', 'la aceptada más cercana (ignora pendientes, completadas y vencidas)');
eq(nextAcceptedBooking([booking('AWAITING_SIGNATURES', '2026-11-20', '2026-11-20')], noon), null, 'sin aceptadas → null');
eq(upcomingBookings(list, noon).map((b) => b.booking_id), ['pend', 'soon', 'late'], 'upcomingBookings sigue ordenando por inicio');

console.log(`OK: ${checks} comprobaciones de reservas del Partner`);
