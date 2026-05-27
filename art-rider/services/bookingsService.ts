"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getMyProviderId } from "@/services/helpers/getMyProviderId";
import { checkAvailability } from "@/services/availabilityService";

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
    booking_units: raw.snapshot_listing ? [{
      id: "mock",
      listing_id: raw.snapshot_listing.id,
      quantity: 1,
      listing: {
        id: raw.snapshot_listing.id,
        title: raw.snapshot_listing.title,
        price_per_day: raw.snapshot_listing.daily_price,
      }
    }] : [],
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
        `id, status, start_date, end_date, total_price, client_id, provider_id, created_at, archived_at, snapshot_listing, payments(status), reviews(id, author_id)`
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
        `id, status, start_date, end_date, total_price, client_id, provider_id, created_at, archived_at, snapshot_listing, client_profile:profiles!client_id(id, full_name, avatar_url), payments(status), reviews(id, author_id)`
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

// ── New Actions (Phase 2) ──────────────────────────────────────────────────

export async function calculateBookingPrice(
  listingId: string,
  startDateStr: string,
  endDateStr: string
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: listing, error } = await supabase
      .from("listings")
      .select("daily_price")
      .eq("id", listingId)
      .single();

    if (error || !listing) return { error: "Listing not found" };

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const timeDiff = end.getTime() - start.getTime();
    let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    if (days <= 0) days = 1;

    const subtotal = listing.daily_price * days;
    const serviceFeePercent = 0.05; // 5% ArtRider fee
    const serviceFee = Math.round(subtotal * serviceFeePercent);
    const total = subtotal + serviceFee;

    return {
      days,
      dailyPrice: listing.daily_price,
      subtotal,
      serviceFee,
      total,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function createBooking(
  listingId: string,
  startDateStr: string,
  endDateStr: string
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Get listing and price
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, provider_id, daily_price, title")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) return { error: "Listing not found" };

    // Get provider's user_id separately to avoid relation errors
    const { data: provider, error: providerErr } = await supabase
      .from("providers")
      .select("user_id")
      .eq("id", listing.provider_id)
      .single();

    if (providerErr || !provider) return { error: "Provider not found" };

    // Prevent booking own equipment
    if (provider.user_id === user.id) {
      return { error: "Cannot book your own equipment" };
    }

    const priceCalc = await calculateBookingPrice(listingId, startDateStr, endDateStr);
    if ("error" in priceCalc) return { error: priceCalc.error };

    // Validate date availability on the backend
    const isAvailable = await checkAvailability(listingId, startDateStr, endDateStr);
    if (!isAvailable) {
      return { error: "Las fechas seleccionadas ya no están disponibles o tienen conflicto de solapamiento." };
    }

    // Check if this user already has a pending booking request ('AWAITING_SIGNATURES') for this same listing on overlapping dates
    const adminSupabase = createSupabaseAdminClient();
    const { data: existingPending, error: pendingErr } = await adminSupabase
      .from("booking_units")
      .select(`
        id,
        booking:bookings!inner(id, client_id, start_date, end_date, status),
        equipment_unit:equipment_units!inner(listing_id)
      `)
      .eq("bookings.client_id", user.id)
      .eq("bookings.status", "AWAITING_SIGNATURES")
      .eq("equipment_units.listing_id", listingId);

    if (pendingErr) {
      console.error("Error checking existing pending bookings:", pendingErr);
    } else if (existingPending && existingPending.length > 0) {
      const startReq = new Date(startDateStr);
      const endReq = new Date(endDateStr);

      const hasOverlap = existingPending.some((ep: any) => {
        const b = ep.booking;
        if (!b) return false;
        const bStart = new Date(b.start_date);
        const bEnd = new Date(b.end_date);
        return (startReq <= bEnd && endReq >= bStart);
      });

      if (hasOverlap) {
        return { error: "Ya tienes una solicitud de reserva pendiente para este equipo en el rango de fechas seleccionado." };
      }
    }

    // Create booking
    // Note: Triggers in DB automatically handle snapshots
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        client_id: user.id,
        provider_id: listing.provider_id,
        start_date: startDateStr,
        end_date: endDateStr,
        total_price: priceCalc.total,
        status: "AWAITING_SIGNATURES",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking error:", bookingError);
      return { error: bookingError.message };
    }

    // Assign unit to booking (picking the first available unit for simplicity)
    const { data: units, error: selectUnitErr } = await adminSupabase
      .from("equipment_units")
      .select("id")
      .eq("listing_id", listingId)
      .eq("internal_status", "AVAILABLE")
      .limit(1);

    if (selectUnitErr) {
      console.error("Error selecting equipment unit:", selectUnitErr);
      return { error: "Error al verificar la unidad física disponible: " + selectUnitErr.message };
    }

    if (!units || units.length === 0) {
      return { error: "No hay unidades físicas disponibles para este equipo en el inventario." };
    }

    const { error: unitInsertError } = await adminSupabase.from("booking_units").insert({
      booking_id: booking.id,
      equipment_unit_id: units[0].id,
      locked_daily_price: priceCalc.dailyPrice,
    });

    if (unitInsertError) {
      console.error("Booking unit insert error:", unitInsertError);
      return { error: "No se pudo asignar el equipo físico a la reserva: " + unitInsertError.message };
    }

    // Trigger notification and email in the background asynchronously to speed up response
    (async () => {
      try {
        // Fetch user profile for notification
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        // Trigger notification via our server action (safe inside server context)
        const { createNotification } = await import("./notificationsService");
        await createNotification({
          userId: provider.user_id,
          type: "booking_request",
          title: "Nueva solicitud de reserva",
          body: `${clientProfile?.full_name || "Un usuario"} quiere reservar ${listing.title}`,
          href: "/provider/bookingsProvider",
        });

        // We can also send the email here
        const { resend, RESEND_FROM_EMAIL } = await import("@/lib/resend");
        const { emailTemplates } = await import("@/lib/email-templates");
        
        const { data: providerProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", provider.user_id)
          .single();
          
        if (resend && providerProfile?.email) {
          await resend.emails.send({
            from: `ArtRider <${RESEND_FROM_EMAIL}>`,
            to: providerProfile.email,
            subject: "Nueva solicitud de alquiler en ArtRider",
            html: emailTemplates.bookingRequest(
              providerProfile.full_name || "Proveedor",
              listing.title,
              clientProfile?.full_name || "Un cliente"
            ),
          });
        }
      } catch (err) {
        console.error("Error sending background notifications/emails:", err);
      }
    })();

    return { success: true, bookingId: booking.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
) {
  try {
    const providerId = await getMyProviderId();
    if (!providerId) return { error: "Not authorized as provider" };
    
    const supabase = await createSupabaseServerClient();
    
    // Check ownership
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, client_id, provider_id")
      .eq("id", bookingId)
      .single();
      
    if (fetchError || !booking || booking.provider_id !== providerId) {
      return { error: "Booking not found or not owned" };
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId)
      .eq("provider_id", providerId);

    if (updateError) return { error: updateError.message };

    // Fetch details for notifications
    const { data: listingData } = await supabase
      .from("booking_units")
      .select("listing:listings(title)")
      .eq("booking_id", bookingId)
      .limit(1)
      .single();
      
    const listingTitle = (listingData?.listing as any)?.title || "un equipo";
    const { createNotification } = await import("./notificationsService");

    if (status === "PAID" || status === "ACTIVE") {
      // In a real flow, 'AWAITING_SIGNATURES' -> Client pays/signs -> 'PAID'
      // For this phase, accepting directly sets to PAID or ACTIVE.
      await createNotification({
        userId: booking.client_id,
        type: "booking_confirmed",
        title: "¡Reserva confirmada!",
        body: "Tu solicitud para " + listingTitle + " fue aceptada.",
        href: "/bookings",
      });
    } else if (status === "CANCELLED") {
      await createNotification({
        userId: booking.client_id,
        type: "booking_cancelled",
        title: "Reserva cancelada",
        body: "Tu solicitud para " + listingTitle + " fue rechazada por el proveedor.",
        href: "/bookings",
      });
    }

    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function cancelBooking(bookingId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, client_id, status, provider_id")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking || booking.client_id !== user.id) {
      return { error: "Not authorized" };
    }

    // Get provider separately
    const { data: provider } = await supabase
      .from("providers")
      .select("user_id")
      .eq("id", booking.provider_id)
      .single();

    if (booking.status !== "AWAITING_SIGNATURES") {
      return { error: "Solo se pueden cancelar reservas pendientes." };
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "CANCELLED" })
      .eq("id", bookingId)
      .eq("client_id", user.id);

    if (updateError) return { error: updateError.message };

    if (provider?.user_id) {
      const { createNotification } = await import("./notificationsService");
      await createNotification({
        userId: provider.user_id,
        type: "booking_cancelled",
        title: "Reserva cancelada",
        body: "El cliente ha cancelado la solicitud de reserva.",
        href: "/provider/bookingsProvider",
      });
    }

    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
