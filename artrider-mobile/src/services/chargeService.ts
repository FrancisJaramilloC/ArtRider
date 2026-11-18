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
    /** Solo si el cobro no se pudo anular tras fallar la reserva: se le muestra al Rider para que hable con soporte. */
    ticketNumber?: string;
};

export type ChargePayload =
    | { kind: 'listing'; listingId: string; startDate: string; endDate: string; quantity: number }
    | { kind: 'package'; packageId: string; startDate: string; endDate: string }
    | { kind: 'cart' };

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

    let res: Response;
    let data: {
        error?: string;
        code?: string;
        bookingId?: string;
        orderId?: string;
        total?: number;
        ticketNumber?: string;
        quote?: ChargeQuote;
    };
    try {
        res = await fetch(`${SUPABASE_URL}/functions/v1/kushki-charge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify(body),
        });
        data = await res.json();
    } catch (error) {
        // Sin conexión: esperado, sin cuadro rojo. No sabemos si el servidor llegó a cobrar: se avisa con claridad.
        console.warn('[chargeService] fallo de red al cobrar:', error instanceof Error ? error.message : error);
        return { error: 'No pudimos confirmar tu pago por un problema de conexión. Revisa tus reservas antes de volver a intentarlo para no pagar dos veces.', code: 'NETWORK' };
    }

    if (res.status === 409 && data.code === 'PRICE_CHANGED') {
        return { error: data.error ?? 'Los precios cambiaron. Revisa el nuevo total antes de pagar.', code: 'PRICE_CHANGED', quote: data.quote };
    }
    if (!res.ok || data.error) {
        return { error: data.error ?? 'No se pudo procesar el pago', code: data.code, ticketNumber: data.ticketNumber };
    }
    return { bookingId: data.bookingId, orderId: data.orderId, total: data.total };
}
