// Supabase Edge Function: provider-respond-booking
// El proveedor acepta o rechaza una reserva pendiente. Si rechaza (o
// cancela una ya aceptada) y hubo cobro real, reembolsa en Kushki con la
// key privada antes de marcar la reserva como cancelada.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPublishableKey, getServiceKey } from '../_shared/keys.ts';
import { LIVE_REFUND_STATUSES, refundBooking } from '../_shared/refunds.ts';

/** Estados desde los que el Partner puede rechazar (pendiente) o cancelar (ya aceptada). */
const REJECTABLE_STATUSES = ['AWAITING_SIGNATURES', 'PAID', 'ACTIVE'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respond(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bookingId, action } = await req.json();

    if (!bookingId || !['accept', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      getPublishableKey(),
      { global: { headers: { Authorization: authHeader } } }
    );

    // Confirma propiedad y trae los datos necesarios para el reembolso.
    const { data: rows, error: fetchError } = await supabase.rpc('get_booking_for_provider_action', {
      p_booking_id: bookingId,
    });

    if (fetchError || !rows?.[0]) {
      if (fetchError) console.error('[provider-respond-booking] get_booking_for_provider_action', { bookingId, error: fetchError.message });
      return respond({ error: 'Reserva no encontrada' }, 404);
    }

    // Propiedad ya confirmada arriba. Cliente service_role para leer payment_refunds (solo servidor) y el estado actual.
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, getServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === 'accept') {
      // No se acepta una reserva con un reembolso vivo (p. ej. el Rider la está cancelando o ya se le devolvió el dinero).
      const { data: liveRefunds, error: refundsError } = await admin
        .from('payment_refunds')
        .select('id')
        .eq('booking_id', bookingId)
        .in('status', [...LIVE_REFUND_STATUSES])
        .limit(1);
      if (refundsError) {
        console.error('[provider-respond-booking] lectura de payment_refunds', { bookingId, error: refundsError.message });
        return respond({ error: 'Error procesando la solicitud' }, 500);
      }
      if (liveRefunds && liveRefunds.length > 0) {
        return respond(
          { error: 'Esta reserva tiene un reembolso en curso o ya fue cancelada.', code: 'REFUND_IN_PROGRESS' },
          409
        );
      }

      const { error } = await supabase.rpc('provider_set_booking_status', {
        p_booking_id: bookingId,
        p_new_status: 'ACTIVE',
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // action === 'reject'
    // Solo lectura del estado actual: no se reembolsa una reserva que ya no se puede rechazar/cancelar (p. ej. COMPLETED).
    const { data: current, error: statusError } = await admin
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .maybeSingle();
    if (statusError) {
      console.error('[provider-respond-booking] lectura del estado', { bookingId, error: statusError.message });
      return respond({ error: 'Error procesando la solicitud' }, 500);
    }
    if (!current || !REJECTABLE_STATUSES.includes(String(current.status))) {
      return respond(
        { error: 'La reserva ya no está en un estado que permita rechazarla.', code: 'INVALID_STATE' },
        409
      );
    }

    // El reembolso lo hace _shared/refunds.ts (un registro por intento, un solo reembolso vivo por reserva).
    const refund = await refundBooking(admin, { bookingId, reason: 'PROVIDER_REJECT' });

    // Sin cambiar el estado de la reserva: el Partner puede reintentar (FAILED) o debe esperar (IN_PROGRESS / UNKNOWN).
    if (refund === 'IN_PROGRESS') {
      return respond({ error: 'Ya hay un reembolso en curso para esta reserva.', code: 'REFUND_IN_PROGRESS' }, 409);
    }
    if (refund === 'FAILED') {
      return respond({ error: 'No se pudo procesar el reembolso. Intenta de nuevo.', code: 'REFUND_FAILED' }, 502);
    }
    if (refund === 'UNKNOWN') {
      return respond(
        { error: 'Estamos verificando el reembolso; no lo intentes de nuevo.', code: 'REFUND_UNKNOWN' },
        502
      );
    }

    // REFUNDED / ALREADY_REFUNDED / NO_CHARGE / MANUAL_REQUIRED (D3): la reserva pasa a CANCELLED.
    const { error } = await supabase.rpc('provider_set_booking_status', {
      p_booking_id: bookingId,
      p_new_status: 'CANCELLED',
    });

    if (error) {
      // El reembolso ya quedó registrado pero el estado no se pudo actualizar: revisión manual.
      console.error('[provider-respond-booking] REEMBOLSO HECHO PERO ESTADO NO ACTUALIZADO', {
        bookingId,
        refund,
        error: error.message,
      });
      return respond(
        { error: 'No se pudo actualizar la reserva; la revisaremos.', code: 'STATE_UPDATE_FAILED' },
        500
      );
    }

    if (refund === 'MANUAL_REQUIRED') {
      return respond({
        success: true,
        refunded: false,
        manualRefund: true,
        message: 'Rechazada. ArtRider procesará el reembolso del Rider',
      });
    }

    return respond({ success: true, refunded: refund === 'REFUNDED' || refund === 'ALREADY_REFUNDED' });
  } catch (err: unknown) {
    // El detalle solo va al log: al cliente nunca se le devuelve el mensaje interno.
    console.error('[provider-respond-booking]', err instanceof Error ? err.message : err);
    return respond({ error: 'Error procesando la solicitud' }, 500);
  }
});