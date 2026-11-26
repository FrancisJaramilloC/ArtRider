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
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPublishableKey, getServiceKey } from '../_shared/keys.ts';
import { isUncertainHttpStatus, KUSHKI_BASE_URL, KUSHKI_TIMEOUT_MS } from '../_shared/refunds.ts';
import {
  classifyRpcOutcome,
  decideAfterRpc,
  type ErrorReply,
  findBookingByTicket,
  recordChargeEvent,
  RPC_TIMEOUT_MS,
  type RpcOutcome,
  TRACE_MESSAGES,
  uncertainChargeReply,
  voidCharge,
  voidFailureReply,
} from './void.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Máximo de unidades de un mismo equipo por reserva (igual que la validación de la migración de checkout multi-Partner). */
const MAX_QUANTITY = 20;

/**
 * Si es 'true', se exige `expectedTotal` (la app nueva siempre lo envía). Activarlo cuando las versiones antiguas de la app ya no deban
 * poder pagar: esas versiones muestran los precios VIEJOS y, sin esta exigencia, se les cobraría el total nuevo sin que lo hayan visto.
 */
const REQUIRE_EXPECTED_TOTAL = Deno.env.get('REQUIRE_EXPECTED_TOTAL') === 'true';

/** Límite de auth.getUser() y de cada cotización (get_*_quote). */
const PRECHARGE_STEP_TIMEOUT_MS = 5_000;
/**
 * Plazo global antes de cobrar: si al llegar al cobro ya pasó más que esto desde que empezó la petición, NO se cobra.
 * Con este plazo el peor caso total queda en ≈ 115 s, por debajo de los 120 s del cliente (plan §10).
 */
const PRECHARGE_DEADLINE_MS = 25_000;

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

function reply(r: ErrorReply): Response {
  return json(r.status, r.body);
}

/** Error ANTES de cobrar por tiempo: es seguro reintentar (4xx → la app lo clasifica como reintentable). */
function preChargeTimeout(): ApiError {
  return new ApiError(408, 'No pudimos preparar tu pago a tiempo. Todavía no se hizo ningún cobro: inténtalo de nuevo.', 'PRECHARGE_TIMEOUT');
}

/** Corta una promesa que no acepta AbortSignal (auth.getUser). Si vence, lanza `onTimeout()`. */
async function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(onTimeout()), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
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

  // Bandera "cobro aprobado" (plan §3.7): se pone en cuanto Kushki devuelve un ticket. Si después salta CUALQUIER excepción,
  // el catch exterior responde como cobro incierto ("No pagues de nuevo"), nunca UNEXPECTED con "Inténtalo de nuevo".
  let chargedTicket: string | null = null;
  let chargedTotal = 0;
  let traceAdmin: SupabaseClient | null = null;
  const startedAt = Date.now();

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
    const { data: userData, error: userError } = await withTimeout(supabase.auth.getUser(), PRECHARGE_STEP_TIMEOUT_MS, preChargeTimeout);
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

    // ── Configuración ANTES de cobrar (M3) ───────────────────────────────────────
    // Llave privada de Kushki y cliente service_role: si algo falta, se responde PAYMENT_CONFIG sin haber cobrado.
    // Cliente service_role: las funciones *_for no son ejecutables por el usuario. `clientId` es el id validado por auth.getUser().
    const privateKey = Deno.env.get('KUSHKI_PRIVATE_MERCHANT_ID') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    let admin: SupabaseClient;
    try {
      if (!privateKey) throw new Error('Falta KUSHKI_PRIVATE_MERCHANT_ID');
      if (!supabaseUrl) throw new Error('Falta SUPABASE_URL');
      admin = createClient(supabaseUrl, getServiceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    } catch (e) {
      // Solo el tipo de error: el mensaje puede nombrar variables de entorno (nunca se registran llaves).
      console.error('[kushki-charge] configuración incompleta', { reason: e instanceof Error ? e.name : 'desconocido' });
      return json(500, { error: 'El pago no está disponible en este momento. Inténtalo más tarde.', code: 'PAYMENT_CONFIG' });
    }
    traceAdmin = admin;
    chargedTotal = quote.total;

    // ── Plazo global (plan §10): antes de cobrar es seguro abandonar ────────────────
    if (Date.now() - startedAt > PRECHARGE_DEADLINE_MS) {
      console.error('[kushki-charge] plazo previo al cobro agotado; no se cobra', { ms: Date.now() - startedAt });
      throw preChargeTimeout();
    }

    // ── Paso 1: cobrar en Kushki con la key privada ───────────────────────────────

    const chargedAmount = Number((quote.total / 100).toFixed(2));

    let kushkiData: any;
    let kushkiStatus = 0;
    let kushkiBodyRead = false;
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
        signal: AbortSignal.timeout(KUSHKI_TIMEOUT_MS),
      });
      kushkiStatus = kushkiRes.status;
      // El timeout también cubre la lectura del cuerpo: si falla, no se sabe si Kushki cobró.
      kushkiData = await kushkiRes.json().then(
        (parsed: unknown) => {
          kushkiBodyRead = true;
          return parsed;
        },
        () => ({}),
      );
    } catch (error) {
      // Timeout o red: Kushki pudo haber cobrado. No hay ticket conocido, así que no se intenta anular nada.
      const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'red';
      return await chargeUnknown(reason, { clientId, cart, listingId, packageId, total: quote.total }, { admin, ticket: null });
    }

    // Hay ticket: desde aquí cualquier excepción se trata como cobro incierto (catch exterior). La validación del ticket usa
    // EXACTAMENTE esta misma condición (string no vacío): un ticket de otro tipo es "sin_ticket" (cobro sin confirmar).
    if (typeof kushkiData?.ticketNumber === 'string' && kushkiData.ticketNumber) chargedTicket = kushkiData.ticketNumber;

    // Clasificación de la respuesta del cobro. PAYMENT_DECLINED SOLO ante un rechazo explícito (4xx distinto de 408, o
    // transactionStatus presente y distinto de APPROVAL). Todo lo demás es incierto: el cobro pudo hacerse.
    const unknownCtx = { clientId, cart, listingId, packageId, total: quote.total };
    const unknownTrace = { admin, ticket: chargedTicket };
    const declined = () =>
      json(402, {
        error: kushkiData?.message || kushkiData?.details?.responseText || 'El pago fue rechazado por el banco',
        code: 'PAYMENT_DECLINED',
      });

    if (kushkiStatus < 200 || kushkiStatus >= 300) {
      return isUncertainHttpStatus(kushkiStatus) ? await chargeUnknown(`http_${kushkiStatus}`, unknownCtx, unknownTrace) : declined();
    }
    // 2xx: hace falta cuerpo legible, ticket y un transactionStatus explícito para decidir.
    if (!kushkiBodyRead) return await chargeUnknown('cuerpo_ilegible', unknownCtx, unknownTrace);
    if (!chargedTicket) return await chargeUnknown('sin_ticket', unknownCtx, unknownTrace);
    const transactionStatus = kushkiData?.details?.transactionStatus;
    if (typeof transactionStatus !== 'string' || !transactionStatus) return await chargeUnknown('sin_transaction_status', unknownCtx, unknownTrace);
    if (transactionStatus !== 'APPROVAL') return declined();
    const ticket: string = chargedTicket;

    // ── Paso 2: crear la(s) reserva(s) con el ticket y el MISMO total cobrado ─────

    let bookingId: string | undefined;
    let orderId: string | undefined;
    let rpcError: { message?: string; code?: string } | null = null;
    let rpcOutcome: RpcOutcome;

    const succeeded = (ids: { bookingId?: string; orderId?: string }) =>
      json(200, { success: true, ...ids, subtotal: quote.subtotal, serviceFee: quote.serviceFee, total: quote.total });

    if (cart === true) {
      // Rama carrito (se elimina en otro bloque): timeout propio y la misma clasificación que listing/package, pero SIN búsqueda
      // por ticket. Un resultado incierto nunca se anula (decideAfterRpc con lookup = null → MANUAL_REQUIRED); solo un error
      // explícito anula.
      try {
        const res = await admin
          .rpc('create_cart_order_for', {
            p_client_id: clientId, p_kushki_ticket: ticket, p_expected_total: quote.total,
          })
          .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));
        rpcError = res.error;
        orderId = res.data?.[0]?.order_id;
        rpcOutcome = classifyRpcOutcome({ status: res.status, error: res.error, bookingId: orderId });
      } catch (e) {
        console.error('[kushki-charge] el RPC del carrito lanzó', { reason: e instanceof Error ? e.name : 'desconocido' });
        rpcOutcome = classifyRpcOutcome({ threw: true });
      }
    } else {
      // Timeout propio (plan §3.3). Abortar NO cancela la transacción: por eso un resultado incierto nunca se anula a ciegas.
      try {
        const res = packageId
          ? await admin
            .rpc('create_package_booking_for', {
              p_client_id: clientId, p_package_id: packageId, p_start_date: startDate, p_end_date: endDate,
              p_kushki_ticket: ticket, p_expected_total: quote.total,
            })
            .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS))
          : await admin
            .rpc('create_booking_for', {
              p_client_id: clientId, p_listing_id: listingId, p_start_date: startDate, p_end_date: endDate,
              p_kushki_ticket: ticket, p_quantity: qty, p_expected_total: quote.total,
            })
            .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));
        rpcError = res.error;
        bookingId = res.data?.[0]?.booking_id;
        rpcOutcome = classifyRpcOutcome({ status: res.status, error: res.error, bookingId });
      } catch (e) {
        console.error('[kushki-charge] el RPC de reserva lanzó', { reason: e instanceof Error ? e.name : 'desconocido' });
        rpcOutcome = classifyRpcOutcome({ threw: true });
      }
    }

    if (rpcOutcome !== 'OK') {
      const message = rpcError?.message ?? '';
      // La BD dice que el ticket ya pertenece a otra reserva: nunca se anula (anularía el cobro de esa otra reserva).
      // (No debería ocurrir: el ticket lo acaba de generar Kushki en este cobro.)
      const ticketAlreadyUsed = message.includes('TICKET_YA_USADO');

      // Respuesta del RPC perdida o TICKET_YA_USADO (plan §3.4, §10): antes de decidir se busca la reserva por
      // bookings.kushki_ticket + client_id. La rama carrito no busca (se elimina en otro bloque; ver plan §11).
      const lookup = cart === true ? null : await findBookingByTicket(admin, ticket, clientId);
      const decision = decideAfterRpc(rpcOutcome, lookup, ticketAlreadyUsed);
      // Solo el código y el mensaje truncado: nunca el detalle completo del error.
      console.error('[kushki-charge] Reserva fallida tras el cobro', {
        code: rpcError?.code ?? null,
        message: message.slice(0, 80),
        rpcOutcome,
        busqueda: lookup?.status ?? 'no_aplica',
        decision: decision.action,
        ticketLast4: ticket.slice(-4),
      });

      if (decision.action === 'SUCCESS') {
        console.error('[kushki-charge] RESERVA_RECUPERADA', { ticketLast4: ticket.slice(-4), rpcOutcome });
        return succeeded({ bookingId: decision.bookingId });
      }
      if (decision.action === 'MANUAL_REQUIRED') {
        // Puede existir (o aparecer) la reserva, o el ticket ya estaba usado: no se anula. Revisión manual (runbook §4.3).
        const traceId = await recordChargeEvent(admin, ticket, quote.total, 'MANUAL_REQUIRED', decision.message);
        return reply(uncertainChargeReply(ticket, !!traceId));
      }

      // decision.action === 'VOID': el RPC falló de forma explícita y no hay reserva. Se anula el cobro (con rastro previo, M2).
      const voidOutcome = await voidCharge(admin, privateKey, ticket, quote.total);
      console.error('[kushki-charge] anulación tras reserva fallida', { ticketLast4: ticket.slice(-4), ...voidOutcome });

      // D/E/F y anulaciones no confirmadas: respuesta incierta con "No pagues de nuevo" (tabla §3.6 del plan).
      const voidReply = voidFailureReply(voidOutcome, ticket);
      if (voidReply) return reply(voidReply);

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
      // Aquí solo se llega con la anulación confirmada y registrada.
      return json(mapped.status, { error: mapped.message, code: mapped.code, ...extra });
    }

    return succeeded({ bookingId, orderId });
  } catch (err: unknown) {
    if (chargedTicket) {
      // Kushki ya devolvió un ticket: el cobro pudo quedar en pie. Rastro de mejor esfuerzo (recordChargeEvent nunca lanza)
      // y respuesta incierta. Si no hay cliente admin no se puede guardar la fila: el ticket completo va al cliente.
      console.error('[kushki-charge] ERROR_TRAS_COBRO', {
        ticketLast4: chargedTicket.slice(-4),
        reason: err instanceof Error ? err.name : 'desconocido',
      });
      const traceId = traceAdmin && chargedTotal > 0
        ? await recordChargeEvent(traceAdmin, chargedTicket, chargedTotal, 'MANUAL_REQUIRED', TRACE_MESSAGES.errorAfterCharge)
        : null;
      return reply(uncertainChargeReply(chargedTicket, !!traceId));
    }
    if (err instanceof ApiError) {
      return json(err.status, { error: err.message, code: err.code, ...err.extra });
    }
    console.error('[kushki-charge] Error inesperado:', err);
    return json(500, { error: 'No pudimos procesar el pago. Revisa tus reservas antes de intentarlo de nuevo.', code: 'UNEXPECTED' });
  }
});

/** Total oficial desde la base de datos (nunca desde el cliente). Con límite de tiempo: si vence, se lanza PRECHARGE_TIMEOUT. */
async function getQuote(
  supabase: ReturnType<typeof createClient>,
  p: { listingId: unknown; packageId: unknown; cart: boolean; startDate: unknown; endDate: unknown; qty: number },
): Promise<Quote> {
  const signal = AbortSignal.timeout(PRECHARGE_STEP_TIMEOUT_MS);
  let result;
  if (p.cart) {
    result = await supabase.rpc('get_cart_quote').abortSignal(signal);
  } else if (p.packageId) {
    result = await supabase.rpc('get_package_quote', { p_package_id: p.packageId, p_start_date: p.startDate, p_end_date: p.endDate }).abortSignal(signal);
  } else {
    result = await supabase.rpc('get_booking_quote', {
      p_listing_id: p.listingId, p_start_date: p.startDate, p_end_date: p.endDate, p_quantity: p.qty,
    }).abortSignal(signal);
  }
  if (result.error) {
    // status 0 = abort/timeout o red: nunca llegó a cotizar, y todavía no se cobró nada.
    if (result.status === 0) {
      console.error('[kushki-charge] cotización sin respuesta', { code: result.error.code ?? null });
      throw preChargeTimeout();
    }
    console.error('[kushki-charge] No se pudo cotizar:', result.error.message);
    throw mapRpcError(result.error.message);
  }
  return toQuote((result.data as Record<string, unknown>[] | null)?.[0]);
}

/**
 * Respuesta cuando no se sabe si Kushki cobró (timeout, red, 408/5xx, cuerpo ilegible, sin ticket o sin transactionStatus).
 * Nunca afirma "no se cobró" y no anula. Si Kushki devolvió un ticket, deja rastro en payment_refunds (MANUAL_REQUIRED, plan §3.2).
 */
async function chargeUnknown(
  reason: string,
  ctx: { clientId: string; cart: unknown; listingId: unknown; packageId: unknown; total: number },
  trace: { admin: SupabaseClient; ticket: string | null },
): Promise<Response> {
  // Aún no existe pedido/reserva (se crean después del cobro): se registra el contexto disponible, sin tarjeta ni llaves.
  console.error('[kushki-charge] COBRO SIN CONFIRMAR', {
    reason,
    clientId: ctx.clientId,
    kind: ctx.cart === true ? 'cart' : ctx.packageId ? 'package' : 'listing',
    listingId: ctx.listingId ?? null,
    packageId: ctx.packageId ?? null,
    total: ctx.total,
    ticketLast4: trace.ticket ? trace.ticket.slice(-4) : null,
  });
  if (!trace.ticket) return reply(uncertainChargeReply(null, false));
  const traceId = await recordChargeEvent(trace.admin, trace.ticket, ctx.total, 'MANUAL_REQUIRED', TRACE_MESSAGES.chargeUnconfirmed);
  if (!traceId) console.error('[kushki-charge] ALERTA_SIN_RASTRO', { ticketLast4: trace.ticket.slice(-4), reason });
  return reply(uncertainChargeReply(trace.ticket, !!traceId));
}
