// Pruebas de void.ts con dobles (sin red ni base de datos): `deno test kushki-charge/void.test.ts`
// Cubren los casos que no se pueden provocar en Kushki UAT (plan §8): D/E/F, fallos de INSERT/UPDATE, timeouts y la regla del ticket.

import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  classifyRpcOutcome,
  findBookingByTicket,
  uncertainChargeReply,
  voidCharge,
  type VoidOutcome,
  voidFailureReply,
} from './void.ts';

const TICKET = '123456789012345678';
const LAST4 = TICKET.slice(-4);

// ── Dobles ──────────────────────────────────────────────────────────────────────────────────────────────────────────

type Step = { data?: unknown; error?: { code?: string; message?: string } | null } | 'throw';

/** Cliente admin falso: cada operación (insert/update/select) consume el siguiente resultado de su cola. */
function fakeAdmin(script: { insert?: Step[]; update?: Step[]; select?: Step[] }) {
  const calls = { insert: [] as Record<string, unknown>[], update: [] as Record<string, unknown>[] };
  const next = (kind: 'insert' | 'update' | 'select') => (): Promise<unknown> => {
    const step = script[kind]?.shift() ?? { data: null, error: { code: 'SIN_GUION' } };
    return step === 'throw' ? Promise.reject(new TypeError('fallo de red simulado')) : Promise.resolve({ data: null, error: null, ...step });
  };
  const chain = (run: () => Promise<unknown>) => {
    const self: Record<string, unknown> = {};
    for (const m of ['select', 'single', 'eq', 'limit', 'abortSignal']) self[m] = () => self;
    self.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => run().then(ok, ko);
    return self;
  };
  const admin = {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        calls.insert.push(row);
        return chain(next('insert'));
      },
      update: (row: Record<string, unknown>) => {
        calls.update.push(row);
        return chain(next('update'));
      },
      select: () => chain(next('select')),
    }),
  };
  return { admin: admin as unknown as SupabaseClient, calls };
}

/** Sustituye fetch durante la prueba y cuenta las llamadas. */
async function withFetch(impl: () => Promise<Response>, fn: (count: () => number) => Promise<void>) {
  const original = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (() => {
    n++;
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

Deno.test('voidCharge: INSERT PENDING → Kushki 200 → UPDATE SUCCEEDED = registrada', async () => {
  const { admin, calls } = fakeAdmin({ insert: [{ data: { id: 'r1' } }], update: [{ data: [{ id: 'r1' }] }] });
  await withFetch(ok200, async (count) => {
    const out = await voidCharge(admin, 'pk', TICKET, 604);
    assertEquals(out, { kushki: 'SUCCEEDED', recorded: true, traceSaved: true });
    assertEquals(count(), 1);
  });
  assertEquals(calls.insert[0].status, 'PENDING');
  assertEquals(calls.insert[0].reason, 'CHARGE_VOID');
  assertEquals(calls.insert[0].booking_id, null);
  assertEquals(calls.update[0].status, 'SUCCEEDED');
  assert(typeof calls.update[0].updated_at === 'string');
});

Deno.test('voidCharge: si falla el INSERT PENDING se anula igual (decisión 3)', async () => {
  const { admin, calls } = fakeAdmin({ insert: [{ error: { code: '42501' } }, { data: { id: 'r2' } }] });
  await withFetch(ok200, async (count) => {
    const out = await voidCharge(admin, 'pk', TICKET, 604);
    assertEquals(count(), 1, 'debe llamar a Kushki aunque no haya fila PENDING');
    assertEquals(out, { kushki: 'SUCCEEDED', recorded: true, traceSaved: true });
  });
  assertEquals(calls.insert[1].status, 'SUCCEEDED', 'INSERT de respaldo con el estado final');
});

Deno.test('Caso D: anulación SUCCEEDED pero fallan los dos INSERT → sin rastro', async () => {
  const { admin } = fakeAdmin({ insert: [{ error: { code: '42501' } }, 'throw'] });
  await withFetch(ok200, async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'SUCCEEDED', recorded: false, traceSaved: false });
  });
});

Deno.test('Caso E: anulación FAILED (4xx) pero falla el INSERT', async () => {
  const { admin } = fakeAdmin({ insert: [{ error: { code: '42501' } }, { error: { code: '42501' } }] });
  await withFetch(rejected400, async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'FAILED', recorded: false, traceSaved: false });
  });
});

Deno.test('Caso F: anulación UNKNOWN (timeout) pero falla el INSERT', async () => {
  const { admin } = fakeAdmin({ insert: ['throw', 'throw'] });
  await withFetch(timeout, async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'UNKNOWN', recorded: false, traceSaved: false });
  });
});

Deno.test('voidCharge: 503 al anular = UNKNOWN; UPDATE fallido deja la fila PENDING (rastro sí, registrada no)', async () => {
  const { admin } = fakeAdmin({ insert: [{ data: { id: 'r3' } }], update: [{ data: [] }] });
  await withFetch(error503, async () => {
    assertEquals(await voidCharge(admin, 'pk', TICKET, 604), { kushki: 'UNKNOWN', recorded: false, traceSaved: true });
  });
});

// ── Respuestas (tabla §3.6) ─────────────────────────────────────────────────────────────────────────────────────────

Deno.test('voidFailureReply: solo SUCCEEDED + registrada usa la respuesta normal', () => {
  assertEquals(voidFailureReply({ kushki: 'SUCCEEDED', recorded: true, traceSaved: true }, TICKET), null);
});

Deno.test('voidFailureReply: D/E/F nunca dicen "No se te cobró nada" y siempre "No pagues de nuevo"', () => {
  const outcomes: VoidOutcome[] = [];
  for (const kushki of ['SUCCEEDED', 'FAILED', 'UNKNOWN'] as const) {
    for (const traceSaved of [true, false]) {
      if (kushki === 'SUCCEEDED' && traceSaved) outcomes.push({ kushki, recorded: false, traceSaved });
      outcomes.push({ kushki, recorded: false, traceSaved });
      if (kushki !== 'SUCCEEDED') outcomes.push({ kushki, recorded: true, traceSaved: true });
    }
  }
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

// ── RPC y búsqueda por ticket (§3.3, §3.4) ──────────────────────────────────────────────────────────────────────────

Deno.test('classifyRpcOutcome', () => {
  assertEquals(classifyRpcOutcome({ status: 200, error: null, bookingId: 'b1' }), 'OK');
  assertEquals(classifyRpcOutcome({ status: 200, error: null, bookingId: undefined }), 'UNCERTAIN');
  assertEquals(classifyRpcOutcome({ status: 400, error: { code: 'P0001' } }), 'EXPLICIT_ERROR');
  assertEquals(classifyRpcOutcome({ status: 500, error: { code: '23505' } }), 'EXPLICIT_ERROR');
  assertEquals(classifyRpcOutcome({ status: 504, error: { code: '' } }), 'UNCERTAIN');
  assertEquals(classifyRpcOutcome({ status: 0, error: { code: '' } }), 'UNCERTAIN');
  assertEquals(classifyRpcOutcome({ threw: true }), 'UNCERTAIN');
});

Deno.test('findBookingByTicket: encontrada / no encontrada / error / excepción', async () => {
  assertEquals(await findBookingByTicket(fakeAdmin({ select: [{ data: [{ id: 'b9' }] }] }).admin, TICKET, 'c1'), { status: 'FOUND', bookingId: 'b9' });
  assertEquals(await findBookingByTicket(fakeAdmin({ select: [{ data: [] }] }).admin, TICKET, 'c1'), { status: 'NOT_FOUND' });
  assertEquals(await findBookingByTicket(fakeAdmin({ select: [{ error: { code: '57014' } }] }).admin, TICKET, 'c1'), { status: 'ERROR' });
  assertEquals(await findBookingByTicket(fakeAdmin({ select: ['throw'] }).admin, TICKET, 'c1'), { status: 'ERROR' });
});
