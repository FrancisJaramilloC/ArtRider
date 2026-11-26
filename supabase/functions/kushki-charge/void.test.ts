// Pruebas de void.ts con dobles (sin red ni base de datos): `deno test kushki-charge/void.test.ts`
// Cubren los casos que no se pueden provocar en Kushki UAT (plan §8): D/E/F, fallos de INSERT/UPDATE, timeouts, la regla del
// ticket, el ORDEN de los pasos de la anulación, los filtros de las consultas y la tabla de decisiones tras el RPC.

import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  type BookingLookup,
  classifyRpcOutcome,
  decideAfterRpc,
  findBookingByTicket,
  type RpcOutcome,
  TRACE_MESSAGES,
  uncertainChargeReply,
  voidCharge,
  type VoidOutcome,
  voidFailureReply,
} from './void.ts';

const TICKET = '123456789012345678';
const LAST4 = TICKET.slice(-4);

// ── Dobles ──────────────────────────────────────────────────────────────────────────────────────────────────────────

type Step = { data?: unknown; error?: { code?: string; message?: string } | null } | 'throw';
type Op = 'insert' | 'update' | 'select';
type EqCall = { table: string; op: Op; column: string; value: unknown };

/**
 * Cliente admin falso. Cada operación (insert/update/select) consume el siguiente resultado de su cola. Registra:
 * - `events`: el orden de las operaciones (compartido con el fetch falso), p. ej. 'insert:PENDING', 'fetch', 'update:SUCCEEDED'.
 * - `eq`: cada filtro .eq(columna, valor) con su tabla y operación.
 */
function fakeAdmin(script: { insert?: Step[]; update?: Step[]; select?: Step[] }, events: string[] = []) {
  const calls = { insert: [] as Record<string, unknown>[], update: [] as Record<string, unknown>[], eq: [] as EqCall[], selectColumns: [] as string[] };
  const next = (kind: Op) => (): Promise<unknown> => {
    const step = script[kind]?.shift() ?? { data: null, error: { code: 'SIN_GUION' } };
    return step === 'throw' ? Promise.reject(new TypeError('fallo de red simulado')) : Promise.resolve({ data: null, error: null, ...step });
  };
  const chain = (table: string, op: Op, run: () => Promise<unknown>) => {
    const self: Record<string, unknown> = {};
    for (const m of ['single', 'limit', 'abortSignal']) self[m] = () => self;
    self.select = (cols: string) => {
      if (op === 'select') calls.selectColumns.push(cols);
      return self;
    };
    self.eq = (column: string, value: unknown) => {
      calls.eq.push({ table, op, column, value });
      return self;
    };
    self.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => run().then(ok, ko);
    return self;
  };
  const admin = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        calls.insert.push(row);
        events.push(`insert:${row.status}`);
        return chain(table, 'insert', next('insert'));
      },
      update: (row: Record<string, unknown>) => {
        calls.update.push(row);
        events.push(`update:${row.status}`);
        return chain(table, 'update', next('update'));
      },
      select: (cols: string) => {
        calls.selectColumns.push(cols);
        events.push(`select:${table}`);
        return chain(table, 'select', next('select'));
      },
    }),
  };
  return { admin: admin as unknown as SupabaseClient, calls, events };
}

/** Sustituye fetch durante la prueba, cuenta las llamadas y anota 'fetch' en el registro de eventos. */
async function withFetch(impl: () => Promise<Response>, events: string[], fn: (count: () => number) => Promise<void>) {
  const original = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (() => {
    n++;
    events.push('fetch');
    return impl();
  }) as typeof fetch;
  try {
    await fn(() => n);
  } finally {
    globalThis.fetch = original;
  }
}

const ok200 = () => Promise.resolve(new Response('{}', { status: 200 }));
const rejected400 = () => Promise.resolve(new Response(JSON.stringify({ message: 'No se puede anular' }), { status: 400 }));
const error503 = () => Promise.resolve(new Response('{}', { status: 503 }));
const timeout = () => Promise.reject(new DOMException('tiempo agotado', 'TimeoutError'));

// ── voidCharge (M2: rastro PENDING antes de llamar a Kushki) ─────────────────────────────────────────────────────────

Deno.test('voidCharge: el INSERT PENDING ocurre ANTES del fetch de anulación, y el UPDATE después', async () => {
  const events: string[] = [];
  const { admin, calls } = fakeAdmin({ insert: [{ data: { id: 'r1' } }], update: [{ data: [{ id: 'r1' }] }] }, events);
  await withFetch(ok200, events, async (count) => {
    const out = await voidCharge(admin, 'pk', TICKET, 604);
    assertEquals(out, { kushki: 'SUCCEEDED', recorded: true, traceSaved: true });
    assertEquals(count(), 1);
  });
  assertEquals(events, ['insert:PENDING', 'fetch', 'update:SUCCEEDED']);
  assertEquals(calls.insert[0].reason, 'CHARGE_VOID');
  assertEquals(calls.insert[0].booking_id, null);
  assert(typeof calls.update[0].updated_at === 'string');
});

Deno.test('voidCharge: el UPDATE final exige id de la fila Y status = PENDING', async () => {
  const { admin, calls } = fakeAdmin({ insert: [{ data: { id: 'r1' } }], update: [{ data: [{ id: 'r1' }] }] });
  await withFetch(ok200, [], async () => {
    await voidCharge(admin, 'pk', TICKET, 604);
  });
  const updateFilters = calls.eq.filter((c) => c.op === 'update').map((c) => [c.column, c.value]);
  assertEquals(updateFilters, [['id', 'r1'], ['status', 'PENDING']]);
});

Deno.test('voidCharge: si falla el INSERT PENDING se anula igual y, sin fila previa, se inserta el respaldo', async () => {
  const events: string[] = [];
  const { admin, calls } = fakeAdmin({ insert: [{ error: { code: '42501' } }, { data: { id: 'r2' } }], select: [{ data: [] }] }, events);
  await withFetch(ok200, events, async (count) => {
    const out = await voidCharge(admin, 'pk', TICKET, 604);
    assertEquals(count(), 1, 'debe llamar a Kushki aunque no haya fila PENDING');
    assertEquals(out, { kushki: 'SUCCEEDED', recorded: true, traceSaved: true });
  });
  assertEquals(events, ['insert:PENDING', 'fetch', 'select:payment_refunds', 'insert:SUCCEEDED']);
  const selectFilters = calls.eq.filter((c) => c.op === 'select').map((c) => [c.column, c.value]);
  assertEquals(selectFilters, [['kushki_ticket', TICKET], ['reason', 'CHARGE_VOID']]);
});

Deno.test('voidCharge: si la fila ya existe (INSERT PENDING guardado con respuesta perdida) NO se inserta otra', async () => {
  const events: string[] = [];
  const { admin, calls } = fakeAdmin({ insert: ['throw'], select: [{ data: [{ id: 'r-existente' }] }] }, events);
  await withFetch(ok200, events, async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'SUCCEEDED', recorded: false, traceSaved: true });
  });
  assertEquals(calls.insert.length, 1, 'solo el INSERT PENDING, sin respaldo');
  assertEquals(events, ['insert:PENDING', 'fetch', 'select:payment_refunds']);
});

Deno.test('Caso D: anulación SUCCEEDED pero fallan los INSERT → sin rastro', async () => {
  const { admin } = fakeAdmin({ insert: [{ error: { code: '42501' } }, 'throw'], select: [{ data: [] }] });
  await withFetch(ok200, [], async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'SUCCEEDED', recorded: false, traceSaved: false });
  });
});

Deno.test('Caso E: anulación FAILED (4xx) pero fallan los INSERT', async () => {
  const { admin } = fakeAdmin({ insert: [{ error: { code: '42501' } }, { error: { code: '42501' } }], select: [{ data: [] }] });
  await withFetch(rejected400, [], async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'FAILED', recorded: false, traceSaved: false });
  });
});

Deno.test('Caso F: anulación UNKNOWN (timeout) pero fallan los INSERT (y la comprobación previa)', async () => {
  const { admin, calls } = fakeAdmin({ insert: ['throw', 'throw'], select: ['throw'] });
  await withFetch(timeout, [], async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'UNKNOWN', recorded: false, traceSaved: false });
  });
  assertEquals(calls.insert.length, 2, 'si la comprobación falla, se intenta el respaldo igualmente');
});

Deno.test('voidCharge: 503 al anular = UNKNOWN; UPDATE fallido deja la fila PENDING (rastro sí, registrada no)', async () => {
  const { admin } = fakeAdmin({ insert: [{ data: { id: 'r3' } }], update: [{ data: [] }] });
  await withFetch(error503, [], async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'UNKNOWN', recorded: false, traceSaved: true });
  });
});

// ── Respuestas (tabla §3.6) ─────────────────────────────────────────────────────────────────────────────────────────

Deno.test('voidFailureReply: solo SUCCEEDED + registrada usa la respuesta normal', () => {
  assertEquals(voidFailureReply({ kushki: 'SUCCEEDED', recorded: true, traceSaved: true }, TICKET), null);
});

Deno.test('voidFailureReply: D/E/F nunca dicen "No se te cobró nada" y siempre "No pagues de nuevo"', () => {
  const outcomes: VoidOutcome[] = [
    { kushki: 'SUCCEEDED', recorded: false, traceSaved: true },
    { kushki: 'SUCCEEDED', recorded: false, traceSaved: false },
    { kushki: 'FAILED', recorded: true, traceSaved: true },
    { kushki: 'FAILED', recorded: false, traceSaved: false },
    { kushki: 'UNKNOWN', recorded: true, traceSaved: true },
    { kushki: 'UNKNOWN', recorded: false, traceSaved: true },
    { kushki: 'UNKNOWN', recorded: false, traceSaved: false },
  ];
  for (const o of outcomes) {
    const r = voidFailureReply(o, TICKET);
    assert(r, `debe haber respuesta para ${JSON.stringify(o)}`);
    const text = String(r.body.error);
    assertEquals(r.body.code, 'CHARGE_VOID_FAILED');
    assertEquals(r.status, 500);
    assert(text.includes('No pagues de nuevo'), text);
    assertFalse(text.includes('No se te cobró'), text);
    assert(text.includes(`…${LAST4}`), text);
    assertFalse(text.includes(TICKET), 'el texto nunca lleva el ticket completo');
  }
});

Deno.test('Regla del ticket: ticketNumber completo solo si no quedó fila', () => {
  assertEquals(voidFailureReply({ kushki: 'FAILED', recorded: false, traceSaved: false }, TICKET)?.body.ticketNumber, TICKET);
  assertEquals(voidFailureReply({ kushki: 'FAILED', recorded: true, traceSaved: true }, TICKET)?.body.ticketNumber, undefined);
  assertEquals(voidFailureReply({ kushki: 'UNKNOWN', recorded: false, traceSaved: true }, TICKET)?.body.ticketNumber, undefined);
  assertEquals(uncertainChargeReply(TICKET, false).body.ticketNumber, TICKET);
  assertEquals(uncertainChargeReply(TICKET, true).body.ticketNumber, undefined);
});

Deno.test('uncertainChargeReply: 502 CHARGE_UNKNOWN con "No pagues de nuevo"', () => {
  const sin = uncertainChargeReply(null, false);
  assertEquals(sin.status, 502);
  assertEquals(sin.body.code, 'CHARGE_UNKNOWN');
  assert(String(sin.body.error).includes('No pagues de nuevo'));
  assertFalse(String(sin.body.error).includes('Referencia'));
  const con = uncertainChargeReply(TICKET, true);
  assert(String(con.body.error).includes(`Referencia: …${LAST4}`));
  assertFalse(String(con.body.error).includes(TICKET));
});

// ── RPC, búsqueda por ticket y decisión (§3.3, §3.4, §10) ───────────────────────────────────────────────────────────

Deno.test('classifyRpcOutcome (408 es incierto, como isUncertainHttpStatus)', () => {
  assertEquals(classifyRpcOutcome({ status: 200, error: null, bookingId: 'b1' }), 'OK');
  assertEquals(classifyRpcOutcome({ status: 200, error: null, bookingId: undefined }), 'UNCERTAIN');
  assertEquals(classifyRpcOutcome({ status: 400, error: { code: 'P0001' } }), 'EXPLICIT_ERROR');
  assertEquals(classifyRpcOutcome({ status: 409, error: { code: '23505' } }), 'EXPLICIT_ERROR');
  assertEquals(classifyRpcOutcome({ status: 408, error: { code: '' } }), 'UNCERTAIN');
  assertEquals(classifyRpcOutcome({ status: 500, error: { code: '23505' } }), 'EXPLICIT_ERROR');
  assertEquals(classifyRpcOutcome({ status: 504, error: { code: '' } }), 'UNCERTAIN');
  assertEquals(classifyRpcOutcome({ status: 0, error: { code: '' } }), 'UNCERTAIN');
  assertEquals(classifyRpcOutcome({ threw: true }), 'UNCERTAIN');
});

Deno.test('findBookingByTicket filtra por kushki_ticket Y client_id y lee el estado', async () => {
  const { admin, calls } = fakeAdmin({ select: [{ data: [{ id: 'b9', status: 'AWAITING_SIGNATURES' }] }] });
  assertEquals(await findBookingByTicket(admin, TICKET, 'c1'), { status: 'FOUND', bookingId: 'b9' });
  assertEquals(calls.eq.map((c) => [c.table, c.column, c.value]), [['bookings', 'kushki_ticket', TICKET], ['bookings', 'client_id', 'c1']]);
  assert(calls.selectColumns[0].includes('status'), 'debe seleccionar status');
});

Deno.test('findBookingByTicket: solo AWAITING_SIGNATURES / PAID / ACTIVE cuentan como encontrada', async () => {
  for (const s of ['AWAITING_SIGNATURES', 'PAID', 'ACTIVE']) {
    const r = await findBookingByTicket(fakeAdmin({ select: [{ data: [{ id: 'b1', status: s }] }] }).admin, TICKET, 'c1');
    assertEquals(r.status, 'FOUND', s);
  }
  for (const s of ['CANCELLED', 'COMPLETED', 'REJECTED', '']) {
    const r = await findBookingByTicket(fakeAdmin({ select: [{ data: [{ id: 'b1', status: s }] }] }).admin, TICKET, 'c1');
    assertEquals(r.status, 'FOUND_INACTIVE', s);
  }
});

Deno.test('findBookingByTicket: no encontrada / error / excepción', async () => {
  assertEquals(await findBookingByTicket(fakeAdmin({ select: [{ data: [] }] }).admin, TICKET, 'c1'), { status: 'NOT_FOUND' });
  assertEquals(await findBookingByTicket(fakeAdmin({ select: [{ error: { code: '57014' } }] }).admin, TICKET, 'c1'), { status: 'ERROR' });
  assertEquals(await findBookingByTicket(fakeAdmin({ select: ['throw'] }).admin, TICKET, 'c1'), { status: 'ERROR' });
});

Deno.test('decideAfterRpc: tabla completa (RPC × búsqueda × TICKET_YA_USADO)', () => {
  const found: BookingLookup = { status: 'FOUND', bookingId: 'b1' };
  const inactive: BookingLookup = { status: 'FOUND_INACTIVE', bookingId: 'b1', bookingStatus: 'CANCELLED' };
  const notFound: BookingLookup = { status: 'NOT_FOUND' };
  const lookupError: BookingLookup = { status: 'ERROR' };
  const M = (message: string) => ({ action: 'MANUAL_REQUIRED', message });

  const table: Array<[RpcOutcome, BookingLookup | null, boolean, unknown]> = [
    // RPC OK: éxito sin buscar.
    ['OK', null, false, { action: 'SUCCESS' }],
    // Reserva encontrada y activa: éxito, nunca se anula (cualquier resultado del RPC, con o sin TICKET_YA_USADO).
    ['EXPLICIT_ERROR', found, false, { action: 'SUCCESS', bookingId: 'b1' }],
    ['UNCERTAIN', found, false, { action: 'SUCCESS', bookingId: 'b1' }],
    ['EXPLICIT_ERROR', found, true, { action: 'SUCCESS', bookingId: 'b1' }],
    // Reserva encontrada pero no activa: revisión manual.
    ['EXPLICIT_ERROR', inactive, false, M(TRACE_MESSAGES.bookingNotActive)],
    ['UNCERTAIN', inactive, false, M(TRACE_MESSAGES.bookingNotActive)],
    ['EXPLICIT_ERROR', inactive, true, M(TRACE_MESSAGES.bookingNotActive)],
    // La búsqueda falló: revisión manual, nunca se anula.
    ['EXPLICIT_ERROR', lookupError, false, M(TRACE_MESSAGES.rpcNoResponse)],
    ['UNCERTAIN', lookupError, false, M(TRACE_MESSAGES.rpcNoResponse)],
    ['EXPLICIT_ERROR', lookupError, true, M(TRACE_MESSAGES.rpcNoResponse)],
    // TICKET_YA_USADO sin reserva de este Rider: revisión manual, nunca se anula (también en carrito, sin búsqueda).
    ['EXPLICIT_ERROR', notFound, true, M(TRACE_MESSAGES.ticketAlreadyUsed)],
    ['EXPLICIT_ERROR', null, true, M(TRACE_MESSAGES.ticketAlreadyUsed)],
    // RPC incierto sin reserva: no se anula a ciegas.
    ['UNCERTAIN', notFound, false, M(TRACE_MESSAGES.rpcNoResponse)],
    ['UNCERTAIN', null, false, M(TRACE_MESSAGES.rpcNoResponse)],
    // Único caso que anula: error explícito y sin reserva (o carrito sin búsqueda).
    ['EXPLICIT_ERROR', notFound, false, { action: 'VOID' }],
    ['EXPLICIT_ERROR', null, false, { action: 'VOID' }],
  ];
  for (const [rpc, lookup, used, expected] of table) {
    assertEquals(decideAfterRpc(rpc, lookup, used), expected, `${rpc} · ${lookup?.status ?? 'sin búsqueda'} · ticketYaUsado=${used}`);
  }
});

Deno.test('TICKET_YA_USADO nunca produce VOID, con cualquier combinación', () => {
  const lookups: Array<BookingLookup | null> = [
    null,
    { status: 'NOT_FOUND' },
    { status: 'ERROR' },
    { status: 'FOUND', bookingId: 'b' },
    { status: 'FOUND_INACTIVE', bookingId: 'b', bookingStatus: 'CANCELLED' },
  ];
  for (const rpc of ['EXPLICIT_ERROR', 'UNCERTAIN'] as const) {
    for (const lookup of lookups) {
      assertFalse(decideAfterRpc(rpc, lookup, true).action === 'VOID', `${rpc} · ${lookup?.status ?? 'sin búsqueda'}`);
    }
  }
});
