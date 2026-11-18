// Pruebas de las reservas del Partner (segmentos por fecha en Ecuador). Ejecutar: pnpm test:partner
import assert from 'node:assert/strict';

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
