// Supabase Edge Function: kushki-charge
// Cobra una tarjeta ya tokenizada vía Kushki (key privada, solo puede vivir aquí, nunca en el bundle de mobile) y, si el pago
// es aprobado, crea la reserva llamando a create_booking_for(), create_package_booking_for() o create_cart_order_for()
// según venga listingId, packageId o cart:true.
//
// CREACIÓN SOLO DESDE EL SERVIDOR (C1 de docs/AUDITORIA_SEGURIDAD.md; requiere aplicar docs/PROPUESTA_C1_CREACION_SOLO_SERVIDOR.sql):
//   * Las funciones *_for solo las puede ejecutar service_role y reciben el id del Rider. Ese id sale SIEMPRE de auth.getUser()
//     (el JWT validado), nunca del cuerpo de la petición. Así nadie puede crear reservas llamando al RPC sin haber pagado.
//   * El ticket que se guarda es el que devolvió Kushki en ESTE cobro; la base de datos rechaza un ticket ya usado.
//   * Las cotizaciones (get_*_quote) siguen usando el cliente con el JWT del usuario: dependen de auth.uid().
//
// NUEVO MODELO DE PRECIOS (ver docs/PROPUESTA_PRECIOS_PLAN.md — requiere aplicar antes docs/PROPUESTA_PRECIOS_CONFIG.sql y
// docs/PROPUESTA_PRECIOS_RPC.sql):
//   * El monto que se cobra lo calcula SOLO la base de datos (get_booking_quote / get_package_quote / get_cart_quote): precio del
//     Partner + comisión, subtotal, tarifa de servicio y redondeo .99 sobre el total. Esta función NO calcula precios y NO usa
//     precios, tasas ni totales enviados por el cliente.
//   * El cliente puede enviar `expectedTotal` (lo que el Rider vio en pantalla). Si no coincide con el total oficial, NO se cobra y se
//     responde 409 con el desglose nuevo (code: 'PRICE_CHANGED') para que la app lo muestre y pida confirmar.
//   * Se cobra EXACTAMENTE el total oficial y ese mismo total se pasa a los RPC (p_expected_total): si las tasas cambiaron entre el
//     cobro y la reserva, el RPC aborta y el cobro se anula.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPublishableKey } from '../_shared/keys.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Kushki en ambiente de pruebas (UAT). Para producción cambiar a https://api.kushkipagos.com y usar la llave privada de producción.
const KUSHKI_BASE_URL = 'https://api-uat.kushkipagos.com';

/** Máximo de unidades de un mismo equipo por reserva (igual que la validación de la migración de checkout multi-Partner). */
const MAX_QUANTITY = 20;

/**
 * Si es 'true', se exige `expectedTotal` (la app nueva siempre lo envía). Activarlo cuando las versiones antiguas de la app ya no deban
 * poder pagar: esas versiones muestran los precios VIEJOS y, sin esta exigencia, se les cobraría el total nuevo sin que lo hayan visto.
 */
const REQUIRE_EXPECTED_TOTAL = Deno.env.get('REQUIRE_EXPECTED_TOTAL') === 'true';

type Quote = { subtotal: number; serviceFee: number; total: number; days: number | null };

/** Error con el estado HTTP, un código estable para la app y un mensaje claro en español. */
class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

/** Traduce el mensaje de un RPC de Postgres a un error claro para el Rider. */
function mapRpcError(message: string): ApiError {
  const m = message ?? '';
  if (m.includes('No autenticado')) return new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.', 'UNAUTHENTICATED');
  if (m.includes('El carrito está vacío')) return new ApiError(400, 'Tu carrito está vacío.', 'EMPTY_CART');
  if (m.includes('Equipo no encontrado')) return new ApiError(404, 'Este equipo ya no está disponible.', 'NOT_FOUND');
  if (m.includes('Paquete no encontrado')) return new ApiError(404, 'Este paquete ya no está disponible.', 'NOT_FOUND');
  if (m.includes('ya no está disponible')) return new ApiError(409, 'Uno de los items de tu carrito ya no está disponible. Revisa tu carrito.', 'ITEM_UNAVAILABLE');
  if (m.includes('No puedes reservar tu propio')) return new ApiError(403, 'No puedes reservar tus propios equipos o paquetes.', 'OWN_ITEM');
  if (m.includes('Rango de fechas inválido')) return new ApiError(400, 'El rango de fechas no es válido.', 'INVALID_DATES');
  if (m.includes('Cantidad inválida')) return new ApiError(400, 'La cantidad no es válida.', 'INVALID_QUANTITY');
  if (m.includes('Falta la configuración de precios')) return new ApiError(500, 'No pudimos calcular el precio en este momento. Inténtalo más tarde.', 'PRICING_UNAVAILABLE');
  if (m.includes('TICKET_YA_USADO')) return new ApiError(409, 'Este pago ya está asociado a otra reserva.', 'TICKET_ALREADY_USED');
  if (m.includes('TICKET_REQUERIDO')) return new ApiError(500, 'No se pudo completar la reserva. Inténtalo de nuevo.', 'RPC_ERROR');
  if (m.includes('Cliente no encontrado')) return new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.', 'UNAUTHENTICATED');
  if (m.includes('No hay') && (m.includes('unidades') || m.includes('stock'))) {
    return new ApiError(409, 'Ya no hay disponibilidad para esas fechas. Cambia las fechas o la cantidad.', 'NO_AVAILABILITY');
  }
  return new ApiError(500, 'No se pudo completar la reserva. Inténtalo de nuevo.', 'RPC_ERROR');
}

function toQuote(row: Record<string, unknown> | undefined): Quote {
  if (!row || !isPositiveInt(row.total) || !Number.isInteger(row.subtotal) || !Number.isInteger(row.service_fee)) {
    throw new ApiError(500, 'No pudimos calcular el total a cobrar. Inténtalo más tarde.', 'QUOTE_FAILED');
  }
  return {
    subtotal: row.subtotal as number,
    serviceFee: row.service_fee as number,
    total: row.total as number,
    days: Number.isInteger(row.days) ? (row.days as number) : null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Método no permitido' });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return json(400, { error: 'Solicitud inválida' });
    }
    // OJO: aquí NO se lee ningún precio, tasa ni total del cliente, salvo `expectedTotal`, que solo se COMPARA.
    const { token, listingId, packageId, cart, startDate, endDate, quantity, expectedTotal } = body as Record<string, unknown>;

    if (typeof token !== 'string' || !token) {
      return json(400, { error: 'Faltan los datos de la tarjeta. Vuelve a ingresarlos.' });
    }
    const kinds = [!!listingId, !!packageId, cart === true].filter(Boolean).length;
    if (kinds !== 1) {
      return json(400, { error: 'Faltan datos de la reserva' });
    }
    if (cart !== true && (!isIsoDate(startDate) || !isIsoDate(endDate))) {
      return json(400, { error: 'Faltan fechas de la reserva' });
    }
    if (cart !== true && (startDate as string) > (endDate as string)) {
      return json(400, { error: 'El rango de fechas no es válido.', code: 'INVALID_DATES' });
    }
    if (expectedTotal !== undefined && expectedTotal !== null && !isPositiveInt(expectedTotal)) {
      return json(400, { error: 'El total esperado no es válido.' });
    }

    if (REQUIRE_EXPECTED_TOTAL && !isPositiveInt(expectedTotal)) {
      return json(426, { error: 'Actualiza la app para poder pagar con los precios nuevos.', code: 'APP_UPDATE_REQUIRED' });
    }

    const qty = listingId ? (quantity === undefined || quantity === null ? 1 : Number(quantity)) : 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      return json(400, { error: 'La cantidad no es válida.', code: 'INVALID_QUANTITY' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { error: 'No autenticado' });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, getPublishableKey(), {
      global: { headers: { Authorization: authHeader } },
    });

    // verify_jwt = false en config.toml: se valida aquí que el token sea de un usuario real.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return json(401, { error: 'Tu sesión expiró. Inicia sesión de nuevo.', code: 'UNAUTHENTICATED' });
    }
    // Único origen del id del Rider para crear reservas: el usuario validado, nunca el cuerpo de la petición.
    const clientId: string = userData.user.id;

    // ── Paso 0: total OFICIAL calculado por la base de datos ─────────────────────
    const quote = await getQuote(supabase, { listingId, packageId, cart: cart === true, startDate, endDate, qty });

    if (isPositiveInt(expectedTotal) && expectedTotal !== quote.total) {
      // No se cobra nada: la app muestra el desglose nuevo y el Rider decide si confirma.
      return json(409, {
        error: 'Los precios cambiaron. Revisa el nuevo total antes de pagar.',
        code: 'PRICE_CHANGED',
        quote: { subtotal: quote.subtotal, serviceFee: quote.serviceFee, total: quote.total, days: quote.days },
      });
    }

    // ── Paso 1: cobrar en Kushki con la key privada ───────────────────────────────
    const privateKey = Deno.env.get('KUSHKI_PRIVATE_MERCHANT_ID');
    if (!privateKey) {
      console.error('[kushki-charge] Falta KUSHKI_PRIVATE_MERCHANT_ID');
      return json(500, { error: 'El pago no está disponible en este momento. Inténtalo más tarde.', code: 'PAYMENT_CONFIG' });
    }

    const chargedAmount = Number((quote.total / 100).toFixed(2));

    let kushkiData: any;
    let kushkiOk = false;
    try {
      const kushkiRes = await fetch(`${KUSHKI_BASE_URL}/card/v1/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
        body: JSON.stringify({
          token,
          fullResponse: 'v2',
          amount: { subtotalIva: 0, subtotalIva0: chargedAmount, ice: 0, iva: 0, currency: 'USD' },
          contactDetails: {
            documentType: 'CC',
            documentNumber: '1700000000',
            email: 'test@artrider.com',
            firstName: 'Cliente',
            lastName: 'ArtRider',
          },
        }),
      });
      kushkiData = await kushkiRes.json().catch(() => ({}));
      kushkiOk = kushkiRes.ok;
    } catch (error) {
      console.error('[kushki-charge] No se pudo contactar a Kushki:', error);
      return json(502, { error: 'No pudimos contactar a la pasarela de pago. No se te cobró nada. Inténtalo de nuevo.', code: 'GATEWAY_UNREACHABLE' });
    }

    const approved = kushkiOk && kushkiData?.ticketNumber && kushkiData?.details?.transactionStatus === 'APPROVAL';
    if (!approved) {
      return json(402, {
        error: kushkiData?.message || kushkiData?.details?.responseText || 'El pago fue rechazado por el banco',
        code: 'PAYMENT_DECLINED',
      });
    }
    const ticket: string = kushkiData.ticketNumber;

    // ── Paso 2: crear la(s) reserva(s) con el ticket y el MISMO total cobrado ─────
    // Cliente service_role: las funciones *_for no son ejecutables por el usuario. `clientId` es el id validado por auth.getUser().
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let bookingId: string | undefined;
    let orderId: string | undefined;
    let rpcError: { message?: string } | null = null;

    if (cart === true) {
      const { data, error } = await admin.rpc('create_cart_order_for', {
        p_client_id: clientId, p_kushki_ticket: ticket, p_expected_total: quote.total,
      });
      rpcError = error;
      orderId = data?.[0]?.order_id;
    } else if (packageId) {
      const { data, error } = await admin.rpc('create_package_booking_for', {
        p_client_id: clientId, p_package_id: packageId, p_start_date: startDate, p_end_date: endDate,
        p_kushki_ticket: ticket, p_expected_total: quote.total,
      });
      rpcError = error;
      bookingId = data?.[0]?.booking_id;
    } else {
      const { data, error } = await admin.rpc('create_booking_for', {
        p_client_id: clientId, p_listing_id: listingId, p_start_date: startDate, p_end_date: endDate,
        p_kushki_ticket: ticket, p_quantity: qty, p_expected_total: quote.total,
      });
      rpcError = error;
      bookingId = data?.[0]?.booking_id;
    }

    if (rpcError || (!bookingId && !orderId)) {
      const message = rpcError?.message ?? '';
      // Si la BD dice que el ticket ya pertenece a otra reserva, NO se anula: anularía el cobro de esa otra reserva.
      // (No debería ocurrir: el ticket lo acaba de generar Kushki en este cobro.)
      const ticketAlreadyUsed = message.includes('TICKET_YA_USADO');
      // El pago ya se cobró pero la reserva falló: se anula el cobro.
      const voided = ticketAlreadyUsed ? false : await voidCharge(privateKey, ticket, chargedAmount);
      console.error('[kushki-charge] Reserva fallida tras el cobro:', message, '· cobro anulado:', voided);

      const mapped = message.includes('PRECIO_CAMBIO')
        ? new ApiError(409, 'Los precios cambiaron mientras pagabas. No se te cobró nada; revisa el nuevo total.', 'PRICE_CHANGED')
        : mapRpcError(message);

      const extra: Record<string, unknown> = {};
      if (mapped.code === 'PRICE_CHANGED') {
        // Mejor esfuerzo: el desglose nuevo para que la app lo muestre.
        try {
          const fresh = await getQuote(supabase, { listingId, packageId, cart: cart === true, startDate, endDate, qty });
          extra.quote = { subtotal: fresh.subtotal, serviceFee: fresh.serviceFee, total: fresh.total, days: fresh.days };
        } catch { /* sin desglose: la app recargará los precios */ }
      }
      if (!voided && !ticketAlreadyUsed) {
        // Caso grave: hay un cobro sin reserva y no se pudo anular. Se avisa con el ticket para soporte.
        return json(500, {
          error: 'Tu pago se realizó pero no pudimos crear la reserva ni anular el cobro. Contacta a soporte con este código: ' + ticket,
          code: 'CHARGE_VOID_FAILED',
          ticketNumber: ticket,
        });
      }
      return json(mapped.status, { error: mapped.message, code: mapped.code, ...extra });
    }

    return json(200, {
      success: true,
      bookingId,
      orderId,
      subtotal: quote.subtotal,
      serviceFee: quote.serviceFee,
      total: quote.total,
    });
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return json(err.status, { error: err.message, code: err.code, ...err.extra });
    }
    console.error('[kushki-charge] Error inesperado:', err);
    return json(500, { error: 'Ocurrió un error procesando el pago. Inténtalo de nuevo.', code: 'UNEXPECTED' });
  }
});

/** Total oficial desde la base de datos (nunca desde el cliente). */
async function getQuote(
  supabase: ReturnType<typeof createClient>,
  p: { listingId: unknown; packageId: unknown; cart: boolean; startDate: unknown; endDate: unknown; qty: number },
): Promise<Quote> {
  let result;
  if (p.cart) {
    result = await supabase.rpc('get_cart_quote');
  } else if (p.packageId) {
    result = await supabase.rpc('get_package_quote', { p_package_id: p.packageId, p_start_date: p.startDate, p_end_date: p.endDate });
  } else {
    result = await supabase.rpc('get_booking_quote', {
      p_listing_id: p.listingId, p_start_date: p.startDate, p_end_date: p.endDate, p_quantity: p.qty,
    });
  }
  if (result.error) {
    console.error('[kushki-charge] No se pudo cotizar:', result.error.message);
    throw mapRpcError(result.error.message);
  }
  return toQuote((result.data as Record<string, unknown>[] | null)?.[0]);
}

/** Anula un cobro ya aprobado. Devuelve true si Kushki confirma la anulación. */
async function voidCharge(privateKey: string, ticket: string, amount: number): Promise<boolean> {
  try {
    const res = await fetch(`${KUSHKI_BASE_URL}/v1/charges/${ticket}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Private-Merchant-Id': privateKey },
      body: JSON.stringify({ fullResponse: 'v2', amount: { subtotalIva: 0, subtotalIva0: amount, ice: 0, iva: 0, currency: 'USD' } }),
    });
    return res.ok;
  } catch (error) {
    console.error('[kushki-charge] No se pudo anular el cobro:', error);
    return false;
  }
}
