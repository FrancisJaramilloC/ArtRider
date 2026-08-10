import { supabase } from './supabase';

export type CreateBookingResult = {
  bookingId?: string;
  subtotal?: number;
  serviceFee?: number;
  total?: number;
  days?: number;
  error?: string;
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
};

/** Reservas del cliente autenticado, con datos del equipo ya resueltos vía RPC. */
export async function getClientBookings(): Promise<ClientBooking[]> {
  const { data, error } = await supabase.rpc('get_client_bookings');

  if (error) {
    console.error('[bookingsService] getClientBookings:', error.message);
    return [];
  }

  return (data ?? []) as ClientBooking[];
}

/** Cliente cancela su propia reserva — solo válida si está AWAITING_SIGNATURES. */
export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'CANCELLED' })
    .eq('id', bookingId)
    .eq('client_id', user.id)
    .eq('status', 'AWAITING_SIGNATURES'); // doble candado: solo cancela si sigue pendiente

  if (error) return { error: 'No se pudo cancelar la reserva' };
  return {};
}
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

/**
 * Llama a la Edge Function que cobra en Kushki (con la key privada, ahí
 * seguro) y crea la reserva si el pago es aprobado.
 */
export async function chargeAndCreateBooking(
  kushkiToken: string,
  listingId: string,
  startDate: string,
  endDate: string,
  quantity: number = 1
): Promise<CreateBookingResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'No autenticado' };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/kushki-charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ token: kushkiToken, listingId, startDate, endDate, quantity }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    return { error: data.error ?? 'No se pudo procesar el pago' };
  }

  return { bookingId: data.bookingId };
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
  endDate: string
): Promise<CreateBookingResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'No autenticado' };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/kushki-charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ token: kushkiToken, packageId, startDate, endDate }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    return { error: data.error ?? 'No se pudo procesar el pago' };
  }

  return { bookingId: data.bookingId };
}