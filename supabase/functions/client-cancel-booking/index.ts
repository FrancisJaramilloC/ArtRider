// Supabase Edge Function: client-cancel-booking
// El Rider cancela una reserva que el Partner aún no respondió (AWAITING_SIGNATURES).
// Reembolsa el total de ESA reserva con _shared/refunds.ts (mismo método que provider-respond-booking al rechazar) y SOLO si
// el reembolso sale bien (o queda MANUAL_REQUIRED, decisión D3) marca la reserva como CANCELLED. Si falla, está en curso o es
// incierto, el estado no cambia.
//
// verify_jwt = false en config.toml (como kushki-charge): el usuario se valida aquí con auth.getUser().
// El UPDATE del estado usa service_role: el cliente no debe poder cambiar bookings por su cuenta (ver docs/PROPUESTA_BOOKINGS_SOLO_SERVIDOR.sql).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPublishableKey, getServiceKey } from '../_shared/keys.ts';
import { refundBooking } from '../_shared/refunds.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'NOT_CANCELLABLE'
  | 'REFUND_IN_PROGRESS'
  | 'REFUND_FAILED'
  | 'REFUND_UNKNOWN'
  | 'STATE_UPDATE_FAILED'
  | 'INTERNAL';

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function fail(code: ErrorCode, error: string, status: number): Response {
  return json({ error, code }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('BAD_REQUEST', 'Método no permitido', 405);

  try {
    const body = await req.json().catch(() => null);
    const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : '';
    if (!bookingId) return fail('BAD_REQUEST', 'Datos inválidos', 400);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return fail('UNAUTHENTICATED', 'No autenticado', 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    // Cliente con el JWT del usuario: identifica al usuario y lee SU reserva (RLS).
    const userClient = createClient(url, getPublishableKey(), { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return fail('UNAUTHENTICATED', 'No autenticado', 401);
    const userId = userData.user.id;

    const { data: booking, error: readError } = await userClient
      .from('bookings')
      .select('id, client_id, status, total_price, kushki_ticket, order_id')
      .eq('id', bookingId)
      .maybeSingle();
    if (readError) {
      console.error('[client-cancel-booking] lectura de la reserva', readError.message);
      return fail('INTERNAL', 'No se pudo leer la reserva', 500);
    }
    // Misma respuesta si no existe o es de otra persona.
    if (!booking || booking.client_id !== userId) return fail('NOT_FOUND', 'Reserva no encontrada', 404);

    // Idempotente: ya cancelada → éxito sin reembolsar otra vez.
    if (booking.status === 'CANCELLED') return json({ success: true, refunded: false, alreadyCancelled: true });
    if (booking.status !== 'AWAITING_SIGNATURES') return fail('NOT_CANCELLABLE', 'Esta reserva ya no se puede cancelar', 409);

    const admin = createClient(url, getServiceKey(), { auth: { persistSession: false, autoRefreshToken: false } });

    // El reembolso lo hace _shared/refunds.ts (un registro por intento, un solo reembolso vivo por reserva).
    const refund = await refundBooking(admin, { bookingId, reason: 'CLIENT_CANCEL' });

    // En estos casos NO se toca el estado: la reserva sigue pendiente.
    if (refund === 'IN_PROGRESS') return fail('REFUND_IN_PROGRESS', 'Ya hay un reembolso en curso para esta reserva.', 409);
    if (refund === 'FAILED') return fail('REFUND_FAILED', 'No se pudo procesar el reembolso', 502);
    if (refund === 'UNKNOWN') return fail('REFUND_UNKNOWN', 'Estamos verificando el reembolso; no lo intentes de nuevo.', 502);

    // REFUNDED / ALREADY_REFUNDED / NO_CHARGE / MANUAL_REQUIRED (D3): se marca CANCELLED.
    const refunded = refund === 'REFUNDED' || refund === 'ALREADY_REFUNDED';
    const manualRefund = refund === 'MANUAL_REQUIRED';

    // Condicional al estado para no pisar una respuesta del Partner.
    const { data: updated, error: updateError } = await admin
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .eq('id', bookingId)
      .eq('client_id', userId)
      .eq('status', 'AWAITING_SIGNATURES')
      .select('id');

    if (updateError || !updated?.length) {
      // Caso raro: el reembolso ya salió. Si otra llamada ya la canceló es éxito; si no, hay que revisarlo a mano.
      const { data: current } = await admin.from('bookings').select('status').eq('id', bookingId).maybeSingle();
      if (current?.status === 'CANCELLED') return json({ success: true, refunded, manualRefund, alreadyCancelled: true });
      console.error('[client-cancel-booking] REEMBOLSO HECHO PERO ESTADO NO ACTUALIZADO', { bookingId, refund, error: updateError?.message ?? 'sin filas', status: current?.status });
      return fail('STATE_UPDATE_FAILED', 'No se pudo actualizar la reserva; la revisaremos.', 500);
    }

    return json({ success: true, refunded, manualRefund });
  } catch (e) {
    console.error('[client-cancel-booking]', e instanceof Error ? e.message : e);
    return fail('INTERNAL', 'Error procesando la solicitud', 500);
  }
});
