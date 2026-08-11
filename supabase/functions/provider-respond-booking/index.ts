// Supabase Edge Function: provider-respond-booking
// El proveedor acepta o rechaza una reserva pendiente. Si rechaza (o
// cancela una ya aceptada) y hubo cobro real, reembolsa en Kushki con la
// key privada antes de marcar la reserva como cancelada.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Confirma propiedad y trae los datos necesarios para el reembolso.
    const { data: rows, error: fetchError } = await supabase.rpc('get_booking_for_provider_action', {
      p_booking_id: bookingId,
    });

    if (fetchError || !rows?.[0]) {
      return new Response(JSON.stringify({ error: fetchError?.message ?? 'Reserva no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const booking = rows[0];

    if (action === 'accept') {
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
    if (booking.kushki_ticket) {
      const privateKey = Deno.env.get('KUSHKI_PRIVATE_MERCHANT_ID');
      if (!privateKey) {
        return new Response(JSON.stringify({ error: 'Falta configuración de Kushki' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const refundRes = await fetch(`https://api-uat.kushkipagos.com/v1/charges/${booking.kushki_ticket}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
        body: JSON.stringify({
          fullResponse: 'v2',
          amount: { subtotalIva: 0, subtotalIva0: booking.total_price / 100, ice: 0, iva: 0, currency: 'USD' },
        }),
      });

      if (!refundRes.ok) {
        const refundData = await refundRes.json().catch(() => ({}));
        return new Response(
          JSON.stringify({ error: refundData.message ?? 'No se pudo procesar el reembolso. Intenta de nuevo.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { error } = await supabase.rpc('provider_set_booking_status', {
      p_booking_id: bookingId,
      p_new_status: 'CANCELLED',
    });

    if (error) {
      // El reembolso ya se procesó pero el estado no se pudo actualizar —
      // caso raro, pero hay que reportarlo claro para revisión manual.
      return new Response(JSON.stringify({ error: 'Reembolso procesado pero no se pudo actualizar el estado: ' + error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, refunded: !!booking.kushki_ticket }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error procesando la solicitud: ' + err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});