// Reembolsos de reservas en Kushki, con registro en public.payment_refunds.
// Solo para Edge Functions con cliente service_role (la tabla no es accesible para anon/authenticated).
//
// Garantías (ver docs/PLAN_pagos-reembolsos.md, A2):
//   * Un solo reembolso "vivo" por reserva: lo impone el índice único parcial payment_refunds_one_live_per_booking,
//     así que dos llamadas simultáneas producen como máximo UNA llamada a Kushki.
//   * Kushki solo permite UN reembolso parcial por ticket. Si otra reserva del mismo ticket ya tiene un reembolso vivo,
//     no se llama a Kushki: el caso queda como MANUAL_REQUIRED para procesarlo a mano en la consola de Kushki.
//   * Timeout, error de red o HTTP 408/5xx → UNKNOWN (puede que Kushki sí lo haya hecho): no se reintenta solo.
//     FAILED solo para un 4xx explícito de Kushki.
//   * Nunca se registran llaves, tokens ni datos de tarjeta.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Kushki en ambiente de pruebas (UAT). Para producción cambiar a https://api.kushkipagos.com y usar la llave privada de producción.
export const KUSHKI_BASE_URL = 'https://api-uat.kushkipagos.com';
export const KUSHKI_TIMEOUT_MS = 25_000;

const UNIQUE_VIOLATION = '23505';
/** Estados de payment_refunds que cuentan como reembolso "vivo": los mismos del índice único parcial del SQL. */
export const LIVE_REFUND_STATUSES = ['PENDING', 'SUCCEEDED', 'UNKNOWN', 'MANUAL_REQUIRED'] as const;

/**
 * Para una respuesta NO 2xx de Kushki: ¿el resultado es incierto? Solo un 4xx distinto de 408 es un rechazo explícito.
 * 408 (timeout), 5xx y cualquier otro código pueden llegar después de que Kushki procesara la operación: se tratan como
 * UNKNOWN, nunca como FAILED, y no se reintentan solos.
 */
export function isUncertainHttpStatus(status: number): boolean {
  const explicitReject = status >= 400 && status < 500 && status !== 408;
  return !explicitReject;
}

export type RefundReason = 'PROVIDER_REJECT' | 'CLIENT_CANCEL';

export type RefundResult =
  | 'REFUNDED'
  | 'ALREADY_REFUNDED'
  | 'NO_CHARGE'
  | 'MANUAL_REQUIRED'
  | 'IN_PROGRESS'
  | 'FAILED'
  | 'UNKNOWN';

interface RefundParams {
  bookingId: string;
  reason: RefundReason;
}

type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | 'MANUAL_REQUIRED';

/** Convierte el estado de una fila viva ya existente en el resultado que se devuelve sin llamar a Kushki. */
function resultFromExistingStatus(status: string | undefined): RefundResult {
  if (status === 'SUCCEEDED') return 'ALREADY_REFUNDED';
  if (status === 'MANUAL_REQUIRED') return 'MANUAL_REQUIRED';
  return 'IN_PROGRESS'; // PENDING, UNKNOWN o fila que ya no se encuentra (carrera): se trata como en curso.
}

/**
 * Guarda el estado final de la fila. Devuelve true solo si se actualizó exactamente esa fila.
 * Si devuelve false, la fila sigue PENDING (bloquea la reserva) y quien llama NO debe devolver un resultado que haga
 * cambiar el estado de la reserva: se resuelve a mano con docs/RUNBOOK_reembolsos.md.
 */
async function setRefundStatus(
  admin: SupabaseClient,
  refundId: string,
  status: RefundStatus,
  detail: { code?: string | null; message?: string | null } = {},
): Promise<boolean> {
  const { data, error } = await admin
    .from('payment_refunds')
    .update({
      status,
      kushki_code: detail.code ?? null,
      kushki_message: detail.message ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', refundId)
    .select('id');
  const saved = !error && (data?.length ?? 0) === 1;
  if (!saved) {
    console.error('[refunds] NO SE PUDO REGISTRAR EL ESTADO DEL REEMBOLSO (fila queda PENDING)', {
      refundId,
      status,
      error: error?.message ?? 'sin filas actualizadas',
    });
  }
  return saved;
}

/** ¿El mismo ticket ya tiene un reembolso vivo (no FAILED) registrado para OTRA reserva? */
async function otherLiveRefundOnTicket(admin: SupabaseClient, ticket: string, refundId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('payment_refunds')
    .select('id')
    .eq('kushki_ticket', ticket)
    .neq('id', refundId)
    .neq('status', 'FAILED')
    .limit(1);
  // Solo error.code: el message puede incluir la URL de la consulta con el ticket completo.
  if (error) throw new Error(`No se pudo consultar los reembolsos del ticket (código ${error.code ?? 'desconocido'})`);
  return (data?.length ?? 0) > 0;
}

/**
 * Reembolsa en Kushki el total de UNA reserva y deja el intento registrado.
 * No cambia el estado de la reserva: eso lo decide quien llama según el resultado.
 */
export async function refundBooking(admin: SupabaseClient, { bookingId, reason }: RefundParams): Promise<RefundResult> {
  // 1) Datos de la reserva.
  const { data: booking, error: readError } = await admin
    .from('bookings')
    .select('id, order_id, total_price, kushki_ticket, status')
    .eq('id', bookingId)
    .maybeSingle();
  if (readError) throw new Error('No se pudo leer la reserva: ' + readError.message);
  if (!booking) throw new Error('Reserva no encontrada');
  if (!booking.kushki_ticket) return 'NO_CHARGE';

  // 2) Fila PENDING. Si choca con el índice único, ya hay un reembolso vivo y NO se llama a Kushki.
  const { data: inserted, error: insertError } = await admin
    .from('payment_refunds')
    .insert({
      booking_id: booking.id,
      order_id: booking.order_id,
      kushki_ticket: booking.kushki_ticket,
      amount_cents: booking.total_price,
      reason,
      status: 'PENDING',
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    if (insertError?.code !== UNIQUE_VIOLATION) {
      // Solo el código: la fila insertada lleva el ticket completo y no debe acabar en logs ni respuestas.
      throw new Error(`No se pudo registrar el reembolso (código ${insertError?.code ?? 'sin respuesta'})`);
    }
    const { data: existing } = await admin
      .from('payment_refunds')
      .select('status')
      .eq('booking_id', booking.id)
      .in('status', [...LIVE_REFUND_STATUSES])
      .limit(1)
      .maybeSingle();
    return resultFromExistingStatus(existing?.status);
  }
  const refundId: string = inserted.id;

  try {
    // 3) Guardia H2: un pedido con varias reservas comparte ticket y Kushki admite un solo reembolso parcial por ticket.
    if (booking.order_id) {
      const { count, error: countError } = await admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', booking.order_id);
      if (countError) throw new Error('No se pudo contar las reservas del pedido: ' + countError.message);

      if ((count ?? 0) > 1 && (await otherLiveRefundOnTicket(admin, booking.kushki_ticket, refundId))) {
        const saved = await setRefundStatus(admin, refundId, 'MANUAL_REQUIRED', {
          message: 'El ticket compartido ya tiene un reembolso parcial; reembolsar a mano en la consola de Kushki.',
        });
        // Sin MANUAL_REQUIRED guardado no se cancela la reserva: quedaría una fila PENDING colgada.
        return saved ? 'MANUAL_REQUIRED' : 'IN_PROGRESS';
      }
    }
  } catch (e) {
    // Sin poder decidir si se puede reembolsar: no se llama a Kushki y la fila no debe bloquear un reintento.
    await setRefundStatus(admin, refundId, 'FAILED', { message: 'Error interno antes de llamar a Kushki' });
    throw e;
  }

  // 4) Llamada a Kushki con el monto de ESTA reserva.
  const privateKey = Deno.env.get('KUSHKI_PRIVATE_MERCHANT_ID');
  if (!privateKey) {
    await setRefundStatus(admin, refundId, 'FAILED', { message: 'Falta configuración de Kushki' });
    throw new Error('Falta configuración de Kushki');
  }

  let res: Response;
  try {
    res = await fetch(`${KUSHKI_BASE_URL}/v1/charges/${encodeURIComponent(booking.kushki_ticket)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
      body: JSON.stringify({
        fullResponse: 'v2',
        amount: { subtotalIva: 0, subtotalIva0: Number((booking.total_price / 100).toFixed(2)), ice: 0, iva: 0, currency: 'USD' },
      }),
      signal: AbortSignal.timeout(KUSHKI_TIMEOUT_MS),
    });
  } catch (e) {
    // 5) Timeout o red: puede haberse hecho. No se reintenta solo.
    // Solo e.name: el message puede incluir la URL con el ticket completo.
    const reasonName = e instanceof Error ? e.name : 'desconocido';
    console.error('[refunds] fallo de red/tiempo en el reembolso', { bookingId, reason: reasonName });
    // Si no se guarda UNKNOWN, la fila sigue PENDING: también bloquea y la reserva no cambia. Se devuelve UNKNOWN igual.
    await setRefundStatus(admin, refundId, 'UNKNOWN', { message: 'Timeout o error de red; verificar en la consola de Kushki.' });
    return 'UNKNOWN';
  }

  if (res.ok) {
    const saved = await setRefundStatus(admin, refundId, 'SUCCEEDED');
    // Kushki reembolsó, pero si la fila no quedó SUCCEEDED no se cancela la reserva (quedaría PENDING colgada):
    // IN_PROGRESS hasta resolverla con el runbook; después, un reintento devuelve ALREADY_REFUNDED y cancela.
    return saved ? 'REFUNDED' : 'IN_PROGRESS';
  }

  const data = await res.json().catch(() => ({}));
  const code = data?.code != null ? String(data.code) : null;
  const message = typeof data?.message === 'string' ? data.message : `Kushki respondió ${res.status}`;

  if (isUncertainHttpStatus(res.status)) {
    // 408/5xx: Kushki pudo haber reembolsado. Igual que un timeout: UNKNOWN, sin reintento automático.
    // Si no se guarda UNKNOWN, la fila sigue PENDING (también bloquea): se devuelve UNKNOWN igual.
    console.error('[refunds] respuesta incierta de Kushki en el reembolso', { bookingId, status: res.status, code, message });
    await setRefundStatus(admin, refundId, 'UNKNOWN', {
      code,
      message: `Kushki respondió ${res.status}; verificar en la consola de Kushki.`,
    });
    return 'UNKNOWN';
  }

  // 4xx explícito: Kushki rechazó el reembolso. La fila FAILED no bloquea un reintento.
  console.error('[refunds] Kushki rechazó el reembolso', { bookingId, status: res.status, code, message });
  const saved = await setRefundStatus(admin, refundId, 'FAILED', { code, message });
  // Si la fila sigue PENDING, un reintento chocaría con ella: no se invita a reintentar (IN_PROGRESS, no FAILED).
  return saved ? 'FAILED' : 'IN_PROGRESS';
}
