// Supabase Edge Function: kushki-charge
// Cobra una tarjeta ya tokenizada vía Kushki (key privada, solo puede
// vivir aquí, nunca en el bundle de mobile) y, si el pago es aprobado,
// crea la reserva llamando a la función create_booking() de Postgres.

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
    const { token, listingId, startDate, endDate } = await req.json();

    if (!token || !listingId || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'Faltan datos de la reserva' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente autenticado como el usuario que llama (respeta RLS/auth.uid()
    // dentro de create_booking, igual que si llamara directo desde mobile)
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

    // Precio calculado server-side, nunca confiando en un monto que
    // mandara el cliente — misma fórmula que create_booking() usa después.
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('daily_price')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: 'Equipo no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    const subtotal = listing.daily_price * days;
    const serviceFee = Math.ceil(subtotal * 0.05);
    const total = subtotal + serviceFee;

    // ── Paso 1: cobrar en Kushki con la key privada ──────────────────
    const privateKey = Deno.env.get('KUSHKI_PRIVATE_MERCHANT_ID');
    if (!privateKey) {
      return new Response(JSON.stringify({ error: 'Falta configuración de Kushki' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const kushkiRes = await fetch('https://api-uat.kushkipagos.com/card/v1/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
      body: JSON.stringify({
        token,
        fullResponse: 'v2',
        amount: { subtotalIva: 0, subtotalIva0: total / 100, ice: 0, iva: 0, currency: 'USD' },
        contactDetails: {
          documentType: 'CC',
          documentNumber: '1700000000',
          email: 'test@artrider.com',
          firstName: 'Cliente',
          lastName: 'ArtRider',
        },
      }),
    });

    const kushkiData = await kushkiRes.json();
    const isApproved = kushkiRes.ok && kushkiData.ticketNumber && kushkiData.details?.transactionStatus === 'APPROVAL';

    if (!isApproved) {
      return new Response(
        JSON.stringify({ error: kushkiData.message || kushkiData.details?.responseText || 'El pago fue rechazado por el banco' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Paso 2: crear la reserva con el ticket de Kushki ─────────────
    const { data: bookingRows, error: bookingError } = await supabase.rpc('create_booking', {
      p_listing_id: listingId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_kushki_ticket: kushkiData.ticketNumber,
    });

    if (bookingError) {
      // El pago ya se cobró pero la reserva falló (ej. alguien más tomó
      // la última unidad justo antes) — anulamos el cobro para no dejar
      // al cliente pagando por algo que no consiguió.
      await fetch(`https://api-uat.kushkipagos.com/v1/charges/${kushkiData.ticketNumber}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
        body: JSON.stringify({
          fullResponse: 'v2',
          amount: { subtotalIva: 0, subtotalIva0: total / 100, ice: 0, iva: 0, currency: 'USD' },
        }),
      }).catch(() => {}); // best-effort, no bloquea la respuesta de error al usuario

      return new Response(JSON.stringify({ error: bookingError.message || 'No se pudo crear la reserva' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const booking = bookingRows?.[0];

    return new Response(JSON.stringify({ success: true, bookingId: booking?.booking_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error procesando el pago: ' + err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});