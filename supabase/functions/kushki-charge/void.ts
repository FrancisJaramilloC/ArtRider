// Anulación de cobros de kushki-charge, su registro en payment_refunds (reason CHARGE_VOID, sin reserva) y las respuestas
// de los casos inciertos. Separado de index.ts para poder probarlo con `deno test` (void.test.ts) sin desplegar.
// Plan: docs/PLAN_kushki-charge-endurecimiento.md (§2, §3).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isUncertainHttpStatus, KUSHKI_BASE_URL, KUSHKI_TIMEOUT_MS } from '../_shared/refunds.ts';

/** Timeout propio de los RPC create_*_for (listing/package). Abortar aquí NO cancela la transacción en Postgres. */
export const RPC_TIMEOUT_MS = 15_000;
/** Timeout de la búsqueda de la reserva por ticket antes de anular. */
export const LOOKUP_TIMEOUT_MS = 5_000;

/**
 * Mensajes fijos de kushki_message (decisión 4 del plan): prefijo estable para filtrar en el runbook con LIKE 'PREFIJO%'.
 * Sin interpolar nada: el motivo técnico va solo al log.
 */
export const TRACE_MESSAGES = {
  chargeUnconfirmed: 'COBRO_SIN_CONFIRMAR: Kushki no confirmó el estado del cobro. No se intentó anular. Verificar en consola Kushki.',
  rpcNoResponse: 'RPC_SIN_RESPUESTA: cobro aprobado y reserva no confirmada. Verificar bookings.kushki_ticket antes de anular.',
  errorAfterCharge: 'ERROR_TRAS_COBRO: error inesperado después del cobro. Verificar reserva y cobro.',
  voidInProgress: 'ANULACION_EN_CURSO',
} as const;

export type VoidResult = 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
type TraceStatus = 'PENDING' | VoidResult | 'MANUAL_REQUIRED';

/**
 * Resultado de una anulación.
 * - kushki: lo que respondió Kushki.
 * - recorded: la fila quedó con el estado final (INSERT PENDING + UPDATE confirmados, o el INSERT de respaldo con el estado final).
 * - traceSaved: existe al menos una fila de este ticket (aunque se haya quedado en PENDING). Decide si el ticket completo va al cliente.
 */
export type VoidOutcome = { kushki: VoidResult; recorded: boolean; traceSaved: boolean };

/** Cuerpo y estado HTTP de una respuesta de error (sin Response: así se prueba como función pura). */
export type ErrorReply = { status: number; body: Record<string, unknown> };

function last4(ticket: string): string {
  return ticket.slice(-4);
}

// ── Registro en payment_refunds ──────────────────────────────────────────────────────────────────────────────────────

/** INSERT de una fila CHARGE_VOID (booking_id null). Devuelve el id o null si no se pudo guardar. Nunca lanza. */
export async function recordChargeEvent(
  admin: SupabaseClient,
  ticket: string,
  amountCents: number,
  status: TraceStatus,
  message: string | null,
): Promise<string | null> {
  try {
    const { data, error } = await admin
      .from('payment_refunds')
      .insert({
        booking_id: null,
        order_id: null,
        kushki_ticket: ticket,
        amount_cents: amountCents,
        reason: 'CHARGE_VOID',
        status,
        kushki_message: message,
      })
      .select('id')
      .single();
    if (error || !data?.id) {
      console.error('[kushki-charge] no se pudo registrar en payment_refunds', { ticketLast4: last4(ticket), status, code: error?.code ?? 'sin_id' });
      return null;
    }
    return String(data.id);
  } catch (e) {
    console.error('[kushki-charge] no se pudo registrar en payment_refunds', { ticketLast4: last4(ticket), status, reason: e instanceof Error ? e.name : 'desconocido' });
    return null;
  }
}

/** UPDATE de la fila PENDING al estado final. true solo si cambió exactamente 1 fila. Nunca lanza. */
async function finishChargeEvent(admin: SupabaseClient, rowId: string, status: VoidResult, message: string | null): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from('payment_refunds')
      .update({ status, kushki_message: message, updated_at: new Date().toISOString() })
      .eq('id', rowId)
      .eq('status', 'PENDING')
      .select('id');
    if (error || data?.length !== 1) {
      console.error('[kushki-charge] no se pudo cerrar la fila de anulación', { rowId, status, code: error?.code ?? `filas_${data?.length ?? 0}` });
      return false;
    }
    return true;
  } catch (e) {
    console.error('[kushki-charge] no se pudo cerrar la fila de anulación', { rowId, status, reason: e instanceof Error ? e.name : 'desconocido' });
    return false;
  }
}

// ── Anulación en Kushki ──────────────────────────────────────────────────────────────────────────────────────────────

/** DELETE en Kushki. SUCCEEDED si 2xx, FAILED si 4xx explícito (≠ 408), UNKNOWN si timeout/red/408/5xx. Nunca lanza. */
async function callKushkiVoid(
  privateKey: string,
  ticket: string,
  amountCents: number,
): Promise<{ result: VoidResult; message: string | null }> {
  try {
    const res = await fetch(`${KUSHKI_BASE_URL}/v1/charges/${encodeURIComponent(ticket)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
      body: JSON.stringify({
        fullResponse: 'v2',
        amount: { subtotalIva: 0, subtotalIva0: Number((amountCents / 100).toFixed(2)), ice: 0, iva: 0, currency: 'USD' },
      }),
      signal: AbortSignal.timeout(KUSHKI_TIMEOUT_MS),
    });
    if (res.ok) return { result: 'SUCCEEDED', message: null };
    const data = await res.json().catch(() => ({}));
    if (isUncertainHttpStatus(res.status)) {
      // 408/5xx: Kushki pudo haber anulado. Igual que un timeout: UNKNOWN, sin reintento.
      console.error('[kushki-charge] respuesta incierta al anular el cobro', { status: res.status });
      return { result: 'UNKNOWN', message: `Kushki respondió ${res.status}; verificar en la consola de Kushki.` };
    }
    // 4xx explícito: Kushki rechazó la anulación.
    return { result: 'FAILED', message: typeof data?.message === 'string' ? data.message : `Kushki respondió ${res.status}` };
  } catch (error) {
    // Timeout o red: puede haberse anulado. Solo error.name: el message puede incluir la URL con el ticket completo.
    console.error('[kushki-charge] No se pudo anular el cobro', { reason: error instanceof Error ? error.name : 'desconocido' });
    return { result: 'UNKNOWN', message: 'Timeout o error de red; verificar en la consola de Kushki.' };
  }
}

/**
 * Anula un cobro ya aprobado dejando rastro ANTES de llamar a Kushki (M2):
 *   1) INSERT PENDING  2) DELETE en Kushki  3) UPDATE al estado final.
 * Si el INSERT PENDING falla se anula igual (decisión 3) y se intenta un INSERT de respaldo con el estado final.
 */
export async function voidCharge(admin: SupabaseClient, privateKey: string, ticket: string, amountCents: number): Promise<VoidOutcome> {
  const rowId = await recordChargeEvent(admin, ticket, amountCents, 'PENDING', TRACE_MESSAGES.voidInProgress);
  const { result, message } = await callKushkiVoid(privateKey, ticket, amountCents);

  if (rowId) {
    // Si el UPDATE falla la fila se queda PENDING: es rastro suficiente (runbook §4), pero no "registrada".
    const recorded = await finishChargeEvent(admin, rowId, result, message);
    return { kushki: result, recorded, traceSaved: true };
  }

  const fallbackId = await recordChargeEvent(admin, ticket, amountCents, result, message);
  if (!fallbackId) {
    console.error('[kushki-charge] ALERTA_SIN_RASTRO', { ticketLast4: last4(ticket), anulacion: result });
  }
  return { kushki: result, recorded: !!fallbackId, traceSaved: !!fallbackId };
}

// ── Reserva por ticket (respuesta del RPC perdida) ─────────────────────────────────────────────────────────────────────

export type BookingLookup = { status: 'FOUND'; bookingId: string } | { status: 'NOT_FOUND' } | { status: 'ERROR' };

/** Busca en bookings.kushki_ticket una reserva de este Rider con este ticket. Nunca lanza. */
export async function findBookingByTicket(admin: SupabaseClient, ticket: string, clientId: string): Promise<BookingLookup> {
  try {
    const { data, error } = await admin
      .from('bookings')
      .select('id')
      .eq('kushki_ticket', ticket)
      .eq('client_id', clientId)
      .limit(1)
      .abortSignal(AbortSignal.timeout(LOOKUP_TIMEOUT_MS));
    if (error) {
      console.error('[kushki-charge] no se pudo buscar la reserva por ticket', { ticketLast4: last4(ticket), code: error.code });
      return { status: 'ERROR' };
    }
    const id = data?.[0]?.id;
    return id ? { status: 'FOUND', bookingId: String(id) } : { status: 'NOT_FOUND' };
  } catch (e) {
    console.error('[kushki-charge] no se pudo buscar la reserva por ticket', { ticketLast4: last4(ticket), reason: e instanceof Error ? e.name : 'desconocido' });
    return { status: 'ERROR' };
  }
}

// ── Clasificación del RPC ──────────────────────────────────────────────────────────────────────────────────────────

export type RpcOutcome = 'OK' | 'EXPLICIT_ERROR' | 'UNCERTAIN';

/**
 * OK: hay booking_id y no hay error.
 * EXPLICIT_ERROR: PostgREST respondió un error 4xx, o un 5xx con código SQLSTATE (la transacción hizo ROLLBACK).
 * UNCERTAIN: lanzó, status 0 (abort/timeout/red), 5xx sin SQLSTATE (pasarela) o 2xx sin booking_id: pudo hacer COMMIT.
 */
export function classifyRpcOutcome(r: {
  threw?: boolean;
  status?: number;
  error?: { code?: string } | null;
  bookingId?: string | null;
}): RpcOutcome {
  if (r.threw) return 'UNCERTAIN';
  if (!r.error) return r.bookingId ? 'OK' : 'UNCERTAIN';
  const status = r.status ?? 0;
  if (status >= 400 && status < 500) return 'EXPLICIT_ERROR';
  if (status >= 500 && /^[0-9A-Z]{5}$/.test(r.error.code ?? '')) return 'EXPLICIT_ERROR';
  return 'UNCERTAIN';
}

// ── Respuestas (tabla §3.6 del plan) ──────────────────────────────────────────────────────────────────────────────────

/** Regla del ticket (decisión 5): el ticket completo solo va al cliente si no quedó ninguna fila en payment_refunds. */
function withTicket(body: Record<string, unknown>, ticket: string | null, traceSaved: boolean): Record<string, unknown> {
  return ticket && !traceSaved ? { ...body, ticketNumber: ticket } : body;
}

function reference(ticket: string | null): string {
  return ticket ? ` Referencia: …${last4(ticket)}` : '';
}

/** 502 CHARGE_UNKNOWN: no sabemos si el cobro quedó en pie (o no se anuló a propósito). Siempre "No pagues de nuevo". */
export function uncertainChargeReply(ticket: string | null, traceSaved: boolean): ErrorReply {
  return {
    status: 502,
    body: withTicket(
      {
        error: `No pudimos confirmar tu pago. No pagues de nuevo: revisa tus reservas en unos minutos o escríbenos.${reference(ticket)}`,
        code: 'CHARGE_UNKNOWN',
      },
      ticket,
      traceSaved,
    ),
  };
}

/**
 * Respuesta tras anular un cobro cuya reserva falló. null = anulación confirmada y registrada: se usa la respuesta normal
 * del error de la reserva (la única que puede decir "No se te cobró nada").
 * D: SUCCEEDED sin registro completo · E: FAILED · F: UNKNOWN.
 */
export function voidFailureReply(outcome: VoidOutcome, ticket: string): ErrorReply | null {
  if (outcome.kushki === 'SUCCEEDED' && outcome.recorded) return null;
  const ref = `…${last4(ticket)}`;
  const error =
    outcome.kushki === 'SUCCEEDED'
      ? `No pudimos confirmar el estado de tu pago. No pagues de nuevo: lo revisaremos y te avisaremos. Referencia: ${ref}`
      : outcome.kushki === 'FAILED'
        ? `Tu pago se realizó pero no pudimos crear la reserva ni anular el cobro. No pagues de nuevo: escríbenos con la referencia ${ref}.`
        : `No pudimos confirmar la anulación del cobro. No pagues de nuevo: lo revisaremos y te avisaremos. Referencia: ${ref}`;
  return { status: 500, body: withTicket({ error, code: 'CHARGE_VOID_FAILED' }, ticket, outcome.traceSaved) };
}
