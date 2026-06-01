"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getMyProviderId } from "@/services/helpers/getMyProviderId";

// ── Tipos ──────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "AWAITING_SIGNATURES"
  | "PAID"
  | "ACTIVE"
  | "COMPLETED"
  | "DISPUTE"
  | "CANCELLED"
  | "ARCHIVED";

export interface BookingUnit {
  id: string;
  listing_id: string;
  quantity: number;
  locked_daily_price: number;
  listing: {
    id: string;
    title: string;
    price_per_day: number;
    image_urls?: string[] | null;
    location?: string | null;
  } | null;
}

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
  client_has_reviewed: boolean;
  client_review_rating: number | null;
  client_avg_rating: number;
  client_review_count: number;
}

// ── Constantes reutilizables ───────────────────────────────────────────────

// Campos base compartidos por getClientBookings y getProviderBookings
const BOOKING_BASE_FIELDS = `
  id, status, start_date, end_date, total_price,
  client_id, provider_id, created_at, archived_at,
  snapshot_listing, payments(status), reviews(id, author_id, rating),
  booking_units(
    id, locked_daily_price,
    equipment_unit:equipment_units(
      id, listing:listings(id, title, cover_image_url, address:addresses(city))
    )
  )
`.replace(/\s+/g, " ").trim();

// Campos extra para la vista de proveedor (incluye perfil del cliente)
const PROVIDER_EXTRA = "client_profile:profiles!client_id(id, full_name, avatar_url)";

// ── Helpers internos ───────────────────────────────────────────────────────

/** Agrupa booking_units por listing y cuenta cantidad */
function buildUnitsFromRaw(rawUnits: any[]): BookingUnit[] {
  const grouped = new Map<string, BookingUnit>();

  for (const u of rawUnits) {
    const listing = u.equipment_unit?.listing;
    const id = listing?.id;
    if (!id) continue;

    const existing = grouped.get(id);
    if (existing) {
      existing.quantity += 1;
    } else {
      grouped.set(id, {
        id: u.id,
        listing_id: id,
        quantity: 1,
        locked_daily_price: u.locked_daily_price,
        listing: {
          id,
          title: listing.title,
          price_per_day: u.locked_daily_price,
          image_urls: listing.cover_image_url ? [listing.cover_image_url] : null,
          location: listing.address?.city ?? null,
        },
      });
    }
  }

  return Array.from(grouped.values());
}

/** Construye unidades desde el snapshot (fallback para datos legacy) */
function buildUnitsFromSnapshot(snap: any): BookingUnit[] {
  return [{
    id: "snapshot",
    listing_id: snap.id,
    quantity: 1,
    locked_daily_price: snap.daily_price,
    listing: {
      id: snap.id,
      title: snap.title,
      price_per_day: snap.daily_price,
      image_urls: snap.cover_image_url ? [snap.cover_image_url] : (snap.image_urls ?? null),
      location: snap.location ?? null,
    },
  }];
}

/** Transforma un registro crudo de Supabase a BookingWithDetails */
function mapRawToBooking(raw: any, includeClientProfile: boolean): BookingWithDetails {
  // Prioriza booking_units reales; fallback a snapshot_listing
  const units = raw.booking_units?.length
    ? buildUnitsFromRaw(raw.booking_units)
    : raw.snapshot_listing
      ? buildUnitsFromSnapshot(raw.snapshot_listing)
      : [];

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
    booking_units: units,
    payment_confirmed: (raw.payments ?? [])[0]?.status === "CAPTURED",
    provider_has_reviewed: (raw.reviews ?? []).some(
      (r: any) => r.author_id === raw.provider_id
    ),
    client_has_reviewed: (raw.reviews ?? []).some(
      (r: any) => r.author_id === raw.client_id
    ),
    client_review_rating: (raw.reviews ?? []).find(
      (r: any) => r.author_id === raw.client_id
    )?.rating ?? null,
    client_avg_rating: 0,
    client_review_count: 0,
  };
}

/** Calcula días entre dos fechas (mínimo 1) */
function countDays(startStr: string, endStr: string): number {
  const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
  const days = Math.ceil(ms / 86_400_000) + 1;
  return days > 0 ? days : 1;
}

// ── Consultas de lectura ───────────────────────────────────────────────────

/** Reservas del usuario autenticado como cliente */
export async function getClientBookings(): Promise<BookingWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_BASE_FIELDS)
      .eq("client_id", user.id)
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []).map((r) => mapRawToBooking(r, false));
  } catch {
    return [];
  }
}

/** Reservas dirigidas al proveedor autenticado */
export async function getProviderBookings(): Promise<BookingWithDetails[]> {
  try {
    const providerId = await getMyProviderId();
    if (!providerId) return [];
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(`${BOOKING_BASE_FIELDS}, ${PROVIDER_EXTRA}`)
      .eq("provider_id", providerId)
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false });

    if (error) return [];

    const bookings = (data ?? []).map((r) => mapRawToBooking(r, true));

    // Enriquecer con rating promedio de cada cliente
    const clientIds = [...new Set(bookings.map((b) => b.client_id))];
    if (clientIds.length) {
      const { data: clientReviews } = await supabase
        .from("reviews")
        .select("target_id, rating")
        .in("target_id", clientIds);

      const ratingAcc: Record<string, { sum: number; count: number }> = {};
      for (const r of clientReviews ?? []) {
        if (!ratingAcc[r.target_id]) ratingAcc[r.target_id] = { sum: 0, count: 0 };
        ratingAcc[r.target_id].sum += r.rating;
        ratingAcc[r.target_id].count += 1;
      }

      for (const booking of bookings) {
        const acc = ratingAcc[booking.client_id];
        if (acc) {
          booking.client_avg_rating = acc.sum / acc.count;
          booking.client_review_count = acc.count;
        }
      }
    }

    return bookings;
  } catch {
    return [];
  }
}

// ── Archivado y reseña ─────────────────────────────────────────────────────

/** Verifica si una reserva puede ser archivada por el proveedor */
export async function checkArchivingEligibility(
  bookingId: string
): Promise<{ eligible: boolean; reason?: string }> {
  const DENY = (reason: string) => ({ eligible: false, reason });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DENY("No tienes permiso para esta reserva");

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, status, provider_id, client_id, payments(status), reviews(id, author_id)")
      .eq("id", bookingId)
      .single();

    if (error || !booking) return DENY("No tienes permiso para esta reserva");

    const providerId = await getMyProviderId();
    if (!providerId || booking.provider_id !== providerId)
      return DENY("No tienes permiso para esta reserva");

    if (booking.status !== "COMPLETED")
      return DENY("El alquiler debe estar completado");

    const alreadyReviewed = (booking.reviews ?? []).some(
      (r: any) => r.author_id === booking.provider_id
    );
    if (alreadyReviewed) return DENY("Esta reserva ya ha sido reseñada");

    return { eligible: true };
  } catch {
    return DENY("Error inesperado al verificar la reserva");
  }
}

/** Archiva la reserva y guarda la reseña del proveedor */
export async function archiveBookingWithReview(
  bookingId: string,
  review: { rating: number; content: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No tienes permiso para esta reserva" };

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, provider_id, client_id, status")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) return { success: false, error: "No tienes permiso para esta reserva" };

    const providerId = await getMyProviderId();
    if (!providerId || booking.provider_id !== providerId)
      return { success: false, error: "No tienes permiso para esta reserva" };

    // Validar elegibilidad antes de proceder
    const eligibility = await checkArchivingEligibility(bookingId);
    if (!eligibility.eligible) return { success: false, error: eligibility.reason };

    // Insertar reseña (admin bypasa RLS — validación ya ocurrió arriba)
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    const adminSupabase = createSupabaseAdminClient();
    const { error: reviewError } = await adminSupabase.from("reviews").insert({
      booking_id: bookingId,
      author_id: user.id,
      target_id: booking.client_id,
      rating: review.rating,
      comment: review.content,
    });
    if (reviewError) return { success: false, error: reviewError.message };

    // Marcar como archivada
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "ARCHIVED", archived_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("provider_id", providerId);

    if (updateError) return { success: false, error: "No se pudo archivar la reserva" };
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al archivar la reserva" };
  }
}

// ── Cálculo de precio ──────────────────────────────────────────────────────

const SERVICE_FEE_RATE = 0.05; // 5% comisión ArtRider

/** Calcula precio total de una reserva (subtotal + comisión) */
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

    const days = countDays(startDateStr, endDateStr);
    const subtotal = listing.daily_price * days;
    const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);

    return { days, dailyPrice: listing.daily_price, subtotal, serviceFee, total: subtotal + serviceFee };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Crear reserva ──────────────────────────────────────────────────────────

/** Crea una reserva completa: inserta booking + unit + notificación + email */
export async function createBooking(
  listingId: string,
  startDateStr: string,
  endDateStr: string,
  kushkiTicket?: string
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Obtener listing y provider en paralelo
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, provider_id, daily_price, title")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) return { error: "Listing not found" };

    const { data: provider, error: providerErr } = await supabase
      .from("providers")
      .select("user_id")
      .eq("id", listing.provider_id)
      .single();

    if (providerErr || !provider) return { error: "Provider not found" };
    if (provider.user_id === user.id) return { error: "Cannot book your own equipment" };

    // Calcular precio
    const priceCalc = await calculateBookingPrice(listingId, startDateStr, endDateStr);
    if ("error" in priceCalc) return { error: priceCalc.error };

    // Insertar booking — snapshot_listing garantiza que siempre podamos vincular reseñas al listing
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        client_id: user.id,
        provider_id: listing.provider_id,
        start_date: startDateStr,
        end_date: endDateStr,
        total_price: priceCalc.total,
        status: "AWAITING_SIGNATURES",
        snapshot_listing: { id: listingId, title: listing.title, daily_price: priceCalc.dailyPrice },
        kushki_ticket: kushkiTicket,
      })
      .select()
      .single();

    if (bookingError) return { error: bookingError.message };

    // Asignar primera unidad disponible
    const { data: units } = await supabase
      .from("equipment_units")
      .select("id")
      .eq("listing_id", listingId)
      .eq("internal_status", "AVAILABLE")
      .limit(1);

    if (units?.length) {
      await supabase.from("booking_units").insert({
        booking_id: booking.id,
        equipment_unit_id: units[0].id,
        locked_daily_price: priceCalc.dailyPrice,
      });
    }

    // Obtener nombre del cliente para la notificación
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const clientName = clientProfile?.full_name || "Un usuario";

    // Notificación in-app al proveedor
    const { createNotification } = await import("./notificationsService");
    await createNotification({
      userId: provider.user_id,
      type: "booking_request",
      title: "Nueva solicitud de reserva",
      body: `${clientName} quiere reservar ${listing.title}`,
      href: "/provider/bookingsProvider",
    });

    // Email al proveedor (no bloquea la respuesta)
    sendProviderEmail(supabase, provider.user_id, listing.title, clientName).catch(() => {});

    return { success: true, bookingId: booking.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

/** Envía email de notificación al proveedor (fire-and-forget) */
async function sendProviderEmail(
  supabase: any,
  providerUserId: string,
  listingTitle: string,
  clientName: string
) {
  const { resend, RESEND_FROM_EMAIL } = await import("@/lib/resend");
  const { emailTemplates } = await import("@/lib/email-templates");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", providerUserId)
    .single();

  if (!resend || !profile?.email) return;

  await resend.emails.send({
    from: `ArtRider <${RESEND_FROM_EMAIL}>`,
    to: profile.email,
    subject: "Nueva solicitud de alquiler en ArtRider",
    html: emailTemplates.bookingRequest(
      profile.full_name || "Proveedor",
      listingTitle,
      clientName
    ),
  });
}

// ── Actualizar estado ──────────────────────────────────────────────────────

/** Actualiza estado de reserva y notifica al cliente */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
) {
  try {
    const providerId = await getMyProviderId();
    if (!providerId) return { error: "Not authorized as provider" };

    const supabase = await createSupabaseServerClient();

    // Verificar propiedad
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, client_id, provider_id, kushki_ticket, total_price")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking || booking.provider_id !== providerId)
      return { error: "Booking not found or not owned" };

    if (status === "CANCELLED" && booking.kushki_ticket) {
      // Reembolsar cobro en Kushki
      const privateKey = process.env.KUSHKI_PRIVATE_MERCHANT_ID;
      if (privateKey) {
        try {
          const voidRes = await fetch(`https://api-uat.kushkipagos.com/v1/charges/${booking.kushki_ticket}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Private-Merchant-Id": privateKey
            },
            body: JSON.stringify({
              fullResponse: "v2",
              amount: {
                subtotalIva: 0,
                subtotalIva0: booking.total_price,
                ice: 0,
                iva: 0,
                currency: "USD"
              }
            })
          });
          const voidData = await voidRes.json();
          if (!voidRes.ok || !voidData.isSuccessful) {
            console.error("Kushki Void Error:", voidData);
          }
        } catch (err) {
          console.error("Error al anular transacción:", err);
        }
      }
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId)
      .eq("provider_id", providerId);

    if (updateError) return { error: updateError.message };

    // Obtener título del equipo para la notificación
    const { data: listingData } = await supabase
      .from("booking_units")
      .select("listing:listings(title)")
      .eq("booking_id", bookingId)
      .limit(1)
      .single();

    const title = (listingData?.listing as any)?.title || "un equipo";
    const { createNotification } = await import("./notificationsService");

    // Notificar al cliente según el estado
    if (status === "PAID" || status === "ACTIVE") {
      await createNotification({
        userId: booking.client_id,
        type: "booking_confirmed",
        title: "¡Reserva confirmada!",
        body: `Tu solicitud para ${title} fue aceptada.`,
        href: "/bookings",
      });
    } else if (status === "CANCELLED") {
      await createNotification({
        userId: booking.client_id,
        type: "booking_cancelled",
        title: "Reserva cancelada",
        body: `Tu solicitud para ${title} fue rechazada por el proveedor.`,
        href: "/bookings",
      });
    }

    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Cancelar reserva (cliente) ─────────────────────────────────────────────

/** Cliente cancela su propia reserva pendiente */
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

    if (fetchError || !booking || booking.client_id !== user.id)
      return { error: "Not authorized" };

    if (booking.status !== "AWAITING_SIGNATURES")
      return { error: "Only pending bookings can be cancelled by client." };

    // Obtener user_id del proveedor para notificación
    const { data: provider } = await supabase
      .from("providers")
      .select("user_id")
      .eq("id", booking.provider_id)
      .single();

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