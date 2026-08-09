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
  startDate: string, // YYYY-MM-DD
  endDate: string,
  kushkiTicket?: string
): Promise<CreateBookingResult> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_listing_id: listingId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_kushki_ticket: kushkiTicket ?? null,
  });

  if (error) {
    console.error('[bookingsService] createBooking:', error.message);
    // Traduce los errores conocidos que lanza la función a mensajes claros
    if (error.message.includes('No puedes reservar tu propio equipo')) {
      return { error: 'No puedes reservar tu propio equipo.' };
    }
    if (error.message.includes('No hay unidades disponibles')) {
      return { error: 'Este equipo ya no está disponible para esas fechas.' };
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