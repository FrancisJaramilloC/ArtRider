// Supabase Edge Function: kushki-charge
// Cobra una tarjeta ya tokenizada vía Kushki (key privada, solo puede
// vivir aquí, nunca en el bundle de mobile) y, si el pago es aprobado,
// crea la reserva llamando a create_booking(), create_package_booking(),
// o create_cart_order() según venga listingId, packageId, o cart:true.

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
    const { token, listingId, packageId, cart, startDate, endDate, quantity } = await req.json();

    if (!token || (!listingId && !packageId && !cart)) {
      return new Response(JSON.stringify({ error: 'Faltan datos de la reserva' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!cart && (!startDate || !endDate)) {
      return new Response(JSON.stringify({ error: 'Faltan fechas de la reserva' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const qty = listingId ? (Number(quantity) || 1) : 1;

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
    // mandara el cliente.
    let subtotal: number;

    if (cart) {
      const { data: cartTotal, error: cartError } = await supabase.rpc('get_cart_total');
      if (cartError || cartTotal === null) {
        return new Response(JSON.stringify({ error: 'No se pudo calcular el total del carrito' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (cartTotal === 0) {
        return new Response(JSON.stringify({ error: 'El carrito está vacío' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      subtotal = cartTotal;
    } else {
      let dailyPrice: number;
      if (packageId) {
        const { data: pkg, error: pkgError } = await supabase.from('packages').select('daily_price').eq('id', packageId).single();
        if (pkgError || !pkg) {
          return new Response(JSON.stringify({ error: 'Paquete no encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        dailyPrice = pkg.daily_price;
      } else {
        const { data: listing, error: listingError } = await supabase.from('listings').select('daily_price').eq('id', listingId).single();
        if (listingError || !listing) {
          return new Response(JSON.stringify({ error: 'Equipo no encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        dailyPrice = listing.daily_price;
      }
      const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
      subtotal = dailyPrice * days * qty;
    }

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

    // ── Paso 2: crear la(s) reserva(s) con el ticket de Kushki ───────
    let bookingId: string | undefined;
    let orderId: string | undefined;
    let rpcError: any;

    if (cart) {
      const { data: rows, error } = await supabase.rpc('create_cart_order', { p_kushki_ticket: kushkiData.ticketNumber });
      rpcError = error;
      orderId = rows?.[0]?.order_id;
    } else if (packageId) {
      const { data: rows, error } = await supabase.rpc('create_package_booking', {
        p_package_id: packageId, p_start_date: startDate, p_end_date: endDate, p_kushki_ticket: kushkiData.ticketNumber,
      });
      rpcError = error;
      bookingId = rows?.[0]?.booking_id;
    } else {
      const { data: rows, error } = await supabase.rpc('create_booking', {
        p_listing_id: listingId, p_start_date: startDate, p_end_date: endDate, p_kushki_ticket: kushkiData.ticketNumber, p_quantity: qty,
      });
      rpcError = error;
      bookingId = rows?.[0]?.booking_id;
    }

    if (rpcError) {
      // El pago ya se cobró pero la reserva falló — anulamos el cobro.
      await fetch(`https://api-uat.kushkipagos.com/v1/charges/${kushkiData.ticketNumber}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
        body: JSON.stringify({
          fullResponse: 'v2',
          amount: { subtotalIva: 0, subtotalIva0: total / 100, ice: 0, iva: 0, currency: 'USD' },
        }),
      }).catch(() => {});

      return new Response(JSON.stringify({ error: rpcError.message || 'No se pudo crear la reserva' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, bookingId, orderId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error procesando el pago: ' + err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});