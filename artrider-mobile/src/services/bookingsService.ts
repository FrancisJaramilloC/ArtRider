import { supabase, SUPABASE_URL } from './supabase';
import { serviceError } from '@/utils/errors';
import { chargeWithKushki, type ChargeQuote } from './chargeService';

export type CreateBookingResult = {
  bookingId?: string;
  subtotal?: number;
  serviceFee?: number;
  total?: number;
  days?: number;
  error?: string;
  /** `PRICE_CHANGED`: los precios cambiaron y no se cobró nada (ver chargeService). */
  code?: string;
  quote?: ChargeQuote;
};

/**
 * Crea una reserva completa (booking + asignación de unidad) vía RPC.
 * A diferencia de la web, esta función SÍ verifica solapamiento real de
 * fechas contra reservas activas y bloqueos — evita doble-reserva.
 */
export async function createBooking(
  listingId: string,
  startDate: string,
  endDate: string,
  quantity: number = 1,
  kushkiTicket?: string
): Promise<CreateBookingResult> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_listing_id: listingId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_kushki_ticket: kushkiTicket ?? null,
    p_quantity: quantity,
  });

  if (error) {
    console.error('[bookingsService] createBooking:', error.message);
    if (error.message.includes('No puedes reservar tu propio equipo')) {
      return { error: 'No puedes reservar tu propio equipo.' };
    }
    if (error.message.includes('No hay') && error.message.includes('unidades disponibles')) {
      return { error: 'Ya no hay suficientes unidades disponibles para esas fechas.' };
    }
    return { error: 'No se pudo crear la reserva. Intenta de nuevo.' };
  }

  const row = data?.[0];
  if (!row) return { error: 'No se pudo crear la reserva. Intenta de nuevo.' };

  return {
    bookingId: row.booking_id,
    subtotal: row.subtotal,
    serviceFee: row.service_fee,
    total: row.total,
    days: row.days,
  };
}
export type BookingStatus =
  | 'AWAITING_SIGNATURES'
  | 'PAID'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DISPUTE'
  | 'CANCELLED'
  | 'ARCHIVED';

export type ClientBooking = {
  booking_id: string;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  total_price: number;
  created_at: string;
  listing_title: string | null;
  listing_cover_image_url: string | null;
  listing_city: string | null;
  order_id: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  already_reviewed: boolean;
};

/** Reservas del cliente autenticado, con datos del equipo ya resueltos vía RPC. */
export async function getClientBookings(): Promise<ClientBooking[]> {
  const { data, error } = await supabase.rpc('get_client_bookings');

  if (error) {
    throw serviceError('[bookingsService] getClientBookings', error);
  }

  return (data ?? []) as ClientBooking[];
}

export const CANCEL_FAILED_MESSAGE = 'No pudimos cancelar y reembolsar. Inténtalo de nuevo';

/**
 * El Rider cancela su reserva mientras el Partner no responde (AWAITING_SIGNATURES). La función del servidor
 * (client-cancel-booking) reembolsa el total de esa reserva en Kushki y SOLO si el reembolso sale bien la marca como
 * cancelada: si algo falla, la reserva queda como estaba y se puede reintentar.
 */
export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'No autenticado' };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/client-cancel-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ bookingId }),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; code?: string };
    if (res.ok && data.success) return {};
    if (data.code === 'NOT_CANCELLABLE') return { error: 'Esta reserva ya no se puede cancelar.' };
    console.error('[bookingsService] cancelBooking:', res.status, data.code ?? '', data.error ?? '');
    return { error: CANCEL_FAILED_MESSAGE };
  } catch (e) {
    console.error('[bookingsService] cancelBooking:', e instanceof Error ? e.message : e);
    return { error: CANCEL_FAILED_MESSAGE };
  }
}


/**
 * Llama a la Edge Function que cobra en Kushki (con la key privada, ahí
 * seguro) y crea la reserva si el pago es aprobado.
 */
export async function chargeAndCreateBooking(
  kushkiToken: string,
  listingId: string,
  startDate: string,
  endDate: string,
  quantity: number = 1,
  /** Total (centavos) que el Rider tiene en pantalla: el servidor lo compara con el oficial. */
  expectedTotal: number,
): Promise<CreateBookingResult> {
  const result = await chargeWithKushki(kushkiToken, { kind: 'listing', listingId, startDate, endDate, quantity }, expectedTotal);
  if (result.error) return { error: result.error, code: result.code, quote: result.quote };
  return { bookingId: result.bookingId, total: result.total };
}
/**
 * Crea una reserva de PAQUETE (booking + N booking_units, uno por cada
 * unidad requerida en cada item del paquete) vía RPC. Todo o nada: si algún
 * equipo del paquete no tiene stock suficiente para esas fechas, no se crea
 * nada — la función SQL corre en una sola transacción.
 */
export async function createPackageBooking(
  packageId: string,
  startDate: string,
  endDate: string,
  kushkiTicket?: string
): Promise<CreateBookingResult> {
  const { data, error } = await supabase.rpc('create_package_booking', {
    p_package_id: packageId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_kushki_ticket: kushkiTicket ?? null,
  });

  if (error) {
    console.error('[bookingsService] createPackageBooking:', error.message);
    if (error.message.includes('No puedes reservar tu propio paquete')) {
      return { error: 'No puedes reservar tu propio paquete.' };
    }
    if (error.message.includes('No hay suficiente stock')) {
      return { error: 'Este paquete ya no tiene stock suficiente para esas fechas.' };
    }
    return { error: 'No se pudo crear la reserva. Intenta de nuevo.' };
  }

  const row = data?.[0];
  if (!row) return { error: 'No se pudo crear la reserva. Intenta de nuevo.' };

  return {
    bookingId: row.booking_id,
    subtotal: row.subtotal,
    serviceFee: row.service_fee,
    total: row.total,
    days: row.days,
  };
}

/**
 * Igual que chargeAndCreateBooking pero para paquetes — llama a la misma
 * Edge Function kushki-charge, que necesita saber distinguir listingId de
 * packageId en el body para llamar al RPC correcto server-side.
 */
export async function chargeAndCreatePackageBooking(
  kushkiToken: string,
  packageId: string,
  startDate: string,
  endDate: string,
  expectedTotal: number,
): Promise<CreateBookingResult> {
  const result = await chargeWithKushki(kushkiToken, { kind: 'package', packageId, startDate, endDate }, expectedTotal);
  if (result.error) return { error: result.error, code: result.code, quote: result.quote };
  return { bookingId: result.bookingId, total: result.total };
}
export async function submitReview(bookingId: string, rating: number, comment: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('submit_review', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment || null,
  });

  if (error) {
    console.error('[bookingsService] submitReview:', error.message);
    if (error.message.includes('duplicate key') || error.message.includes('reviews_one_per_booking_author')) {
      return { error: 'Ya calificaste esta reserva.' };
    }
    return { error: 'No se pudo enviar tu calificación.' };
  }
  return {};
}
/** Detalle de una reserva del Rider (RPC get_client_booking_detail, ver docs/PROPUESTA_DETALLE_RESERVA_RIDER.sql). Nunca trae montos del Partner. */
export type ClientBookingDetail = {
  booking_id: string;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  order_id: string | null;
  item_type: 'listing' | 'package';
  /** Equipo o paquete reservado, para «Reservar de nuevo». */
  item_id: string | null;
  /** Publicado y no eliminado hoy: si es false no se ofrece «Reservar de nuevo». */
  item_available: boolean;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  /** Especificaciones del equipo (esquema en constants/listingSpecs.ts); null si no hay. */
  specs: Record<string, unknown> | null;
  /** Solo la ciudad: la dirección exacta se comparte al confirmar. */
  city: string | null;
  quantity: number;
  /** providers.id, para abrir el chat con el Partner. */
  provider_id: string | null;
  provider_name: string | null;
  provider_avatar_url: string | null;
  /** Solo con la reserva activa, pagada o completada. */
  provider_phone: string | null;
  /** NULL en reservas anteriores al nuevo modelo de precios (la app calcula el desglose antiguo). */
  rider_subtotal: number | null;
  service_fee: number | null;
  total_price: number;
  kushki_ticket: string | null;
  already_reviewed: boolean;
};

/** Detalle de una reserva propia; null si no existe o no es del usuario. */
export async function getClientBookingDetail(bookingId: string): Promise<ClientBookingDetail | null> {
  const { data, error } = await supabase.rpc('get_client_booking_detail', { p_booking_id: bookingId });
  if (error) {
    if (error.message.includes('Reserva no encontrada')) return null;
    throw serviceError('[bookingsService] getClientBookingDetail', error);
  }
  const row = (data as ClientBookingDetail[] | null)?.[0];
  return row ?? null;
}

/** Una reserva dentro del pedido. Nunca trae montos del Partner. */
export type ClientOrderLine = {
  booking_id: string;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  item_type: 'listing' | 'package';
  title: string | null;
  quantity: number;
  cover_image_url: string | null;
  provider_name: string | null;
  /** NULL en reservas anteriores al nuevo modelo de precios. */
  rider_subtotal: number | null;
  service_fee: number | null;
  total_price: number;
  already_reviewed: boolean;
};

/** Pedido del carrito del Rider (RPC get_client_order_detail, ver docs/PROPUESTA_DETALLE_PEDIDO_RIDER.sql). */
export type ClientOrderDetail = {
  order: {
    order_id: string;
    status: string | null;
    created_at: string | null;
    total_price: number;
    /** NULL en pedidos anteriores al nuevo modelo de precios y sin desglose en sus líneas. */
    subtotal: number | null;
    service_fee: number | null;
    kushki_ticket: string | null;
  };
  lines: ClientOrderLine[];
};

/** Detalle de un pedido propio; null si no existe o no es del usuario. */
export async function getClientOrderDetail(orderId: string): Promise<ClientOrderDetail | null> {
  const { data, error } = await supabase.rpc('get_client_order_detail', { p_order_id: orderId });
  if (error) {
    if (error.message.includes('Pedido no encontrado')) return null;
    throw serviceError('[bookingsService] getClientOrderDetail', error);
  }
  return (data as ClientOrderDetail | null) ?? null;
}
