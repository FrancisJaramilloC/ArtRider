// Supabase Edge Function: client-cancel-booking
// El Rider cancela una reserva que el Partner aún no respondió (AWAITING_SIGNATURES).
// Reembolsa el total de ESA reserva en Kushki (UAT, mismo método que provider-respond-booking al rechazar) y SOLO si el
// reembolso sale bien marca la reserva como CANCELLED. Si el reembolso falla, el estado no cambia.
//
// verify_jwt = false en config.toml (como kushki-charge): el usuario se valida aquí con auth.getUser().
// El UPDATE del estado usa service_role: el cliente no debe poder cambiar bookings por su cuenta (ver docs/PROPUESTA_BOOKINGS_SOLO_SERVIDOR.sql).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KUSHKI_UAT_CHARGES_URL = 'https://api-uat.kushkipagos.com/v1/charges';
const REFUND_TIMEOUT_MS = 25_000;

type ErrorCode = 'BAD_REQUEST' | 'UNAUTHENTICATED' | 'NOT_FOUND' | 'NOT_CANCELLABLE' | 'REFUND_FAILED' | 'STATE_UPDATE_FAILED' | 'CONFIG' | 'INTERNAL';

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function fail(code: ErrorCode, error: string, status: number): Response {
  return json({ error, code }, status);
}

/** Reembolsa `totalCents` del cobro `ticket`. Devuelve null si salió bien, o el mensaje del fallo. */
async function refundKushki(ticket: string, totalCents: number): Promise<string | null> {
  const privateKey = Deno.env.get('KUSHKI_PRIVATE_MERCHANT_ID');
  if (!privateKey) return 'CONFIG';
  try {
    const res = await fetch(`${KUSHKI_UAT_CHARGES_URL}/${encodeURIComponent(ticket)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
      body: JSON.stringify({
        fullResponse: 'v2',
        // Solo el total de esta reserva (en una compra del carrito el ticket es compartido).
        amount: { subtotalIva: 0, subtotalIva0: Number((totalCents / 100).toFixed(2)), ice: 0, iva: 0, currency: 'USD' },
      }),
      signal: AbortSignal.timeout(REFUND_TIMEOUT_MS),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    console.error('[client-cancel-booking] Kushki rechazó el reembolso', res.status, data?.code ?? '', data?.message ?? '');
    return data?.message ?? `Kushki respondió ${res.status}`;
  } catch (e) {
    console.error('[client-cancel-booking] fallo de red/tiempo en el reembolso', e instanceof Error ? e.message : e);
    return 'No se pudo contactar a Kushki';
  }
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
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
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

    let refunded = false;
    if (booking.kushki_ticket) {
      const failure = await refundKushki(booking.kushki_ticket, booking.total_price);
      if (failure === 'CONFIG') return fail('CONFIG', 'Falta configuración de Kushki', 500);
      // Si el reembolso falla NO se toca el estado: la reserva sigue pendiente y el Rider puede reintentar.
      if (failure) return fail('REFUND_FAILED', 'No se pudo procesar el reembolso', 502);
      refunded = true;
    }

    // Reembolso OK (o no hubo cobro): ahora sí se marca CANCELLED. Condicional al estado para no pisar una respuesta del Partner.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
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
      if (current?.status === 'CANCELLED') return json({ success: true, refunded, alreadyCancelled: true });
      console.error('[client-cancel-booking] REEMBOLSO HECHO PERO ESTADO NO ACTUALIZADO', { bookingId, refunded, error: updateError?.message ?? 'sin filas', status: current?.status });
      return fail('STATE_UPDATE_FAILED', 'El reembolso se procesó pero no se pudo actualizar la reserva', 500);
    }

    return json({ success: true, refunded });
  } catch (e) {
    console.error('[client-cancel-booking]', e instanceof Error ? e.message : e);
    return fail('INTERNAL', 'Error procesando la solicitud', 500);
  }
});
