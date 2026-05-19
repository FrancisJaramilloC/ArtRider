"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getMyProviderId } from "@/services/helpers/getMyProviderId";

//  Tipos para las reservas
export type BookingStatus =
  | "AWAITING_SIGNATURES"
  | "PAID"
  | "ACTIVE"
  | "COMPLETED"
  | "DISPUTE"
  | "CANCELLED"
  | "ARCHIVED";

//  Tipos para las unidades de reserva
export interface BookingUnit {
  id: string;
  listing_id: string;
  quantity: number;
  listing: { id: string; title: string; price_per_day: number } | null;
}

//  Tipos para los detalles de la reserva
export interface BookingWithDetails {
  id: string;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  total_price: number;
  client_id: string;
  provider_id: string;
  created_at: string;
  archived_at: string | null;
  client_profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
  booking_units: BookingUnit[];
  payment_confirmed: boolean;
  provider_has_reviewed: boolean;
}

//  Función auxiliar interna
function mapRawToBookingWithDetails(
  raw: any,
  provider_id: string,
  includeClientProfile: boolean
): BookingWithDetails {
  return {
    id: raw.id,
    status: raw.status as BookingStatus,
    start_date: raw.start_date,
    end_date: raw.end_date,
    total_price: raw.total_price,
    client_id: raw.client_id,
    provider_id: raw.provider_id,
    created_at: raw.created_at,
    archived_at: raw.archived_at ?? null,
    client_profile: includeClientProfile ? (raw.client_profile ?? null) : null,
    booking_units: (raw.booking_units ?? []) as BookingUnit[],
    payment_confirmed: (raw.payments ?? [])[0]?.status === "CAPTURED",
    provider_has_reviewed: (raw.reviews ?? []).some(
      (r: any) => r.author_id === provider_id
    ),
  };
}

//  Función para obtener las reservas del cliente
export async function getClientBookings(): Promise<BookingWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `id, status, start_date, end_date, total_price, client_id, provider_id, created_at, archived_at, booking_units(id, listing_id, quantity, listing:listings(id, title, price_per_day)), payments(status), reviews(id, author_id)`
      )
      .eq("client_id", user.id)
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false });

    if (error) return [];

    return (data ?? []).map((raw) =>
      mapRawToBookingWithDetails(raw, raw.provider_id, false)
    );
  } catch {
    return [];
  }
}

//  Función para obtener las reservas del proveedor
export async function getProviderBookings(): Promise<BookingWithDetails[]> {
  try {
    const providerId = await getMyProviderId();
    if (!providerId) return [];
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `id, status, start_date, end_date, total_price, client_id, provider_id, created_at, archived_at, booking_units(id, listing_id, quantity, listing:listings(id, title, price_per_day)), client_profile:profiles!client_id(id, full_name, avatar_url), payments(status), reviews(id, author_id)`
      )
      .eq("provider_id", providerId)
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false });

    if (error) return [];

    return (data ?? []).map((raw) =>
      mapRawToBookingWithDetails(raw, raw.provider_id, true)
    );
  } catch {
    return [];
  }
}

//  Función para verificar la elegibilidad de archivo
export async function checkArchivingEligibility(
  bookingId: string
): Promise<{ eligible: boolean; reason?: string }> {
  try {
    //  Crea el cliente de Supabase
    const supabase = await createSupabaseServerClient();
    //  Obtiene el usuario
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { eligible: false, reason: "No tienes permiso para esta reserva" };

    //  Obtiene la reserva
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, status, provider_id, client_id, payments(status), reviews(id, author_id)")
      .eq("id", bookingId)
      .single();

    //  Maneja los errores de la reserva
    if (error || !booking) {
      return { eligible: false, reason: "No tienes permiso para esta reserva" };
    }

    //  Obtiene el id del proveedor
    const providerId = await getMyProviderId();
    if (!providerId || booking.provider_id !== providerId) { //  Verifica que el proveedor tenga permiso para esta reserva
      return { eligible: false, reason: "No tienes permiso para esta reserva" };
    }

    if (booking.status !== "COMPLETED") { //  Verifica que la reserva esté completada
      return { eligible: false, reason: "El alquiler debe estar completado" };
    }

    const hasCapturedPayment = (booking.payments ?? []).some(
      (p: any) => p.status === "CAPTURED" //  Verifica que el pago haya sido capturado
    );
    if (!hasCapturedPayment) {
      return { eligible: false, reason: "El pago aún no ha sido capturado" };
    }

    const providerAlreadyReviewed = (booking.reviews ?? []).some(
      (r: any) => r.author_id === booking.provider_id //  Verifica que el proveedor no haya reseñado la reserva
    );
    if (providerAlreadyReviewed) { // Si el proveedor ya ha reseñado la reserva, no se puede archivar
      return { eligible: false, reason: "Esta reserva ya ha sido reseñada" };
    }

    return { eligible: true }; // Si todas las verificaciones pasan, la reserva es elegible para ser archivada
  } catch { // Si hay algun error inesperado al verificar la reserva
    return { eligible: false, reason: "Error inesperado al verificar la reserva" }; // Se retorna un error inesperado
  }
}

//  Función para archivar una reserva con reseña
export async function archiveBookingWithReview(
  bookingId: string,
  review: { rating: number; content: string }
): Promise<{ success: boolean; error?: string }> {
  try { 
    // Inicia el cliente de Supabase
    const supabase = await createSupabaseServerClient();
    // Obtiene el usuario
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No tienes permiso para esta reserva" }; // Si el usuario no tiene permiso para esta reserva

    // Obtiene la reserva
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, provider_id, client_id, status")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) { // Si hay un error al obtener la reserva o la reserva no existe
      return { success: false, error: "No tienes permiso para esta reserva" }; // Se retorna un error
    }

    // Obtiene el id del proveedor
    const providerId = await getMyProviderId();
    if (!providerId || booking.provider_id !== providerId) { // Si el proveedor no tiene permiso para esta reserva
      return { success: false, error: "No tienes permiso para esta reserva" }; // Se retorna un error
    }

    // Verifica la elegibilidad de la reserva para ser archivada
    const eligibility = await checkArchivingEligibility(bookingId);
    if (!eligibility.eligible) { // Si la reserva no es elegible para ser archivada
      return { success: false, error: eligibility.reason }; // Se retorna un error
    }

    // Inserta la reseña
    const { error: reviewError } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      author_id: user.id,
      target_id: booking.client_id,
      rating: review.rating,
      content: review.content,
    });

    if (reviewError) { // Si hay un error al insertar la reseña
      return { success: false, error: "No se pudo guardar la reseña" }; // Se retorna un error
    }

    // Actualiza la reserva como archivada
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "ARCHIVED", archived_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("provider_id", providerId);

    if (updateError) { // Si hay un error al actualizar la reserva como archivada
      return { success: false, error: "No se pudo archivar la reserva" }; // Se retorna un error
    }

    return { success: true }; // Si todas las verificaciones pasan, la reserva es elegible para ser archivada
  } catch { // Si hay algun error inesperado al archivar la reserva
    return { success: false, error: "Error inesperado al archivar la reserva" }; // Se retorna un error inesperado
  }
}
