import { COPY } from '@/constants/copy';
import { supabase, SUPABASE_URL } from './supabase';

/** Desglose oficial calculado por el servidor (centavos). */
export type ChargeQuote = { subtotal: number; serviceFee: number; total: number; days: number | null };

export type ChargeResult = {
    bookingId?: string;
    orderId?: string;
    /** Total que cobró el servidor (centavos). */
    total?: number;
    error?: string;
    /** `PRICE_CHANGED`: los precios cambiaron y NO se cobró nada; `quote` trae el desglose nuevo. Otros códigos: ver la Edge Function. */
    code?: string;
    quote?: ChargeQuote;
    /** Solo si el servidor no pudo guardar el rastro del cobro: se le muestra al Rider para que hable con soporte. */
    ticketNumber?: string;
    /** true = no sabemos si se cobró: la pantalla bloquea "Pagar" y solo ofrece "Ver mis reservas". */
    uncertain?: boolean;
};

export type ChargePayload =
    | { kind: 'listing'; listingId: string; startDate: string; endDate: string; quantity: number }
    | { kind: 'package'; packageId: string; startDate: string; endDate: string }
    | { kind: 'cart' };

/**
 * Tiempo máximo de espera de la app. Mayor que el peor caso del servidor (≈ 115 s, plan §10: plazo previo 25 s + cobro 25 s +
 * reserva 15 s + búsqueda 5 s + anulación con registro 45 s) con 20 s de margen para red y arranque en frío, y 15 s por debajo del
 * límite de la Edge Function (150 s): la app corta antes que la plataforma y muestra SU mensaje.
 */
export const CHARGE_CLIENT_TIMEOUT_MS = 135_000;

/** El cobro pudo hacerse: no se debe pagar de nuevo. TICKET_ALREADY_USED llega después de un cobro aprobado que no se anula. */
const UNCERTAIN_CODES = new Set(['CHARGE_TIMEOUT', 'NETWORK', 'CHARGE_UNKNOWN', 'CHARGE_VOID_FAILED', 'UNEXPECTED', 'TICKET_ALREADY_USED']);
/** El cobro NO se hizo (o se anuló y quedó registrado): se puede reintentar. */
const RETRYABLE_CODES = new Set(['PAYMENT_CONFIG', 'PRICE_CHANGED', 'PAYMENT_DECLINED', 'QUOTE_FAILED', 'PRICING_UNAVAILABLE']);

/**
 * Clasifica un error de kushki-charge: primero por `code`, después por estado HTTP (plan §4.3).
 * Sin código conocido: 5xx → incierto; 4xx → reintentable (validaciones previas al cobro); cualquier otro → incierto.
 */
export function classifyChargeError(code: string | undefined, httpStatus: number): 'retryable' | 'uncertain' {
    if (code && UNCERTAIN_CODES.has(code)) return 'uncertain';
    if (code && RETRYABLE_CODES.has(code)) return 'retryable';
    if (httpStatus >= 400 && httpStatus < 500) return 'retryable';
    return 'uncertain';
}

/** Texto del banner de error: el mensaje del servidor tal cual y, si llegó (solo cuando no quedó rastro), la referencia completa. */
export function formatChargeError(result: Pick<ChargeResult, 'error' | 'ticketNumber'>): string {
    const message = result.error ?? 'No se pudo procesar el pago';
    return result.ticketNumber ? `${message}\n${COPY.bookingPaymentReference}: ${result.ticketNumber}` : message;
}

function uncertain(code: string, ticketNumber?: string): ChargeResult {
    return { error: COPY.paymentUncertain, code, ticketNumber, uncertain: true };
}

type ChargeResponseBody = {
    error?: string;
    code?: string;
    bookingId?: string;
    orderId?: string;
    total?: number;
    ticketNumber?: string;
    quote?: ChargeQuote;
};

/**
 * Llama a la Edge Function `kushki-charge`. El cliente NUNCA envía precios ni tasas: solo el token de la tarjeta, qué se compra y
 * `expectedTotal` (el total que el Rider tiene en pantalla). El servidor calcula el total oficial, lo compara y, si difiere, responde 409
 * PRICE_CHANGED con el desglose nuevo sin cobrar.
 */
export async function chargeWithKushki(kushkiToken: string, payload: ChargePayload, expectedTotal: number): Promise<ChargeResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Tu sesión expiró. Inicia sesión de nuevo.', code: 'UNAUTHENTICATED' };

    const body =
        payload.kind === 'cart'
            ? { token: kushkiToken, cart: true, expectedTotal }
            : payload.kind === 'package'
              ? { token: kushkiToken, packageId: payload.packageId, startDate: payload.startDate, endDate: payload.endDate, expectedTotal }
              : { token: kushkiToken, listingId: payload.listingId, startDate: payload.startDate, endDate: payload.endDate, quantity: payload.quantity, expectedTotal };

    // El mismo AbortController corta la conexión y la lectura del cuerpo.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHARGE_CLIENT_TIMEOUT_MS);

    let res: Response;
    let data: ChargeResponseBody;
    try {
        try {
            res = await fetch(`${SUPABASE_URL}/functions/v1/kushki-charge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        } catch (error) {
            if (controller.signal.aborted) return uncertain('CHARGE_TIMEOUT');
            // Sin conexión: esperado, sin cuadro rojo. No sabemos si el servidor llegó a cobrar.
            console.warn('[chargeService] fallo de red al cobrar:', error instanceof Error ? error.message : error);
            return uncertain('NETWORK');
        }
        try {
            const parsed: unknown = await res.json();
            if (!parsed || typeof parsed !== 'object') return uncertain('CHARGE_UNKNOWN');
            data = parsed as ChargeResponseBody;
        } catch {
            // Respuesta que no es JSON (p. ej. un 504 de la plataforma) o corte durante la lectura: incierto.
            return uncertain(controller.signal.aborted ? 'CHARGE_TIMEOUT' : 'CHARGE_UNKNOWN');
        }
    } finally {
        clearTimeout(timer);
    }

    if (res.status === 409 && data.code === 'PRICE_CHANGED') {
        return { error: data.error ?? 'Los precios cambiaron. Revisa el nuevo total antes de pagar.', code: 'PRICE_CHANGED', quote: data.quote };
    }
    if (!res.ok || data.error) {
        // El mensaje del servidor se muestra tal cual; el texto local solo se usa si el servidor no envió ninguno.
        if (classifyChargeError(data.code, res.status) === 'uncertain') {
            return { error: data.error ?? COPY.paymentUncertain, code: data.code ?? 'CHARGE_UNKNOWN', ticketNumber: data.ticketNumber, uncertain: true };
        }
        return { error: data.error ?? 'No se pudo procesar el pago', code: data.code, ticketNumber: data.ticketNumber };
    }
    // 2xx sin reserva ni pedido: no sabemos qué pasó.
    if (!data.bookingId && !data.orderId) return uncertain('CHARGE_UNKNOWN');
    return { bookingId: data.bookingId, orderId: data.orderId, total: data.total };
}
