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