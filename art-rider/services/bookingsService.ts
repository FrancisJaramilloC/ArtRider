"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  listing: { id: string; title: string; price_per_day: number } | null;
}

export interface BookingWithDetails {
  id: string;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  total_price: number;
  client_id: string;
  owner_id: string;
  created_at: string;
  archived_at: string | null;
  client_profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
  booking_units: BookingUnit[];
  payment_confirmed: boolean;
  provider_has_reviewed: boolean;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function mapRawToBookingWithDetails(
  raw: any,
  ownerId: string,
  includeClientProfile: boolean
): BookingWithDetails {
  return {
    id: raw.id,
    status: raw.status as BookingStatus,
    start_date: raw.start_date,
    end_date: raw.end_date,
    total_price: raw.total_price,
    client_id: raw.client_id,
    owner_id: raw.owner_id,
    created_at: raw.created_at,
    archived_at: raw.archived_at ?? null,
    client_profile: includeClientProfile ? (raw.client_profile ?? null) : null,
    booking_units: (raw.booking_units ?? []) as BookingUnit[],
    payment_confirmed: (raw.payments ?? [])[0]?.status === "CAPTURED",
    provider_has_reviewed: (raw.reviews ?? []).some(
      (r: any) => r.author_id === ownerId
    ),
  };
}

// ── getClientBookings ─────────────────────────────────────────────────────────

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
        `id, status, start_date, end_date, total_price, client_id, owner_id, created_at, archived_at, booking_units(id, listing_id, quantity, listing:listings(id, title, price_per_day)), payments(status), reviews(id, author_id)`
      )
      .eq("client_id", user.id)
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false });

    if (error) return [];

    return (data ?? []).map((raw) =>
      mapRawToBookingWithDetails(raw, raw.owner_id, false)
    );
  } catch {
    return [];
  }
}

// ── getProviderBookings ───────────────────────────────────────────────────────

export async function getProviderBookings(): Promise<BookingWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `id, status, start_date, end_date, total_price, client_id, owner_id, created_at, archived_at, booking_units(id, listing_id, quantity, listing:listings(id, title, price_per_day)), client_profile:profiles!client_id(id, full_name, avatar_url), payments(status), reviews(id, author_id)`
      )
      .eq("owner_id", user.id)
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false });

    if (error) return [];

    return (data ?? []).map((raw) =>
      mapRawToBookingWithDetails(raw, raw.owner_id, true)
    );
  } catch {
    return [];
  }
}

// ── checkArchivingEligibility ─────────────────────────────────────────────────

export async function checkArchivingEligibility(
  bookingId: string
): Promise<{ eligible: boolean; reason?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { eligible: false, reason: "No tienes permiso para esta reserva" };

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, status, owner_id, client_id, payments(status), reviews(id, author_id)")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return { eligible: false, reason: "No tienes permiso para esta reserva" };
    }

    if (booking.owner_id !== user.id) {
      return { eligible: false, reason: "No tienes permiso para esta reserva" };
    }

    if (booking.status !== "COMPLETED") {
      return { eligible: false, reason: "El alquiler debe estar completado" };
    }

    const hasCapturedPayment = (booking.payments ?? []).some(
      (p: any) => p.status === "CAPTURED"
    );
    if (!hasCapturedPayment) {
      return { eligible: false, reason: "El pago aún no ha sido capturado" };
    }

    const providerAlreadyReviewed = (booking.reviews ?? []).some(
      (r: any) => r.author_id === booking.owner_id
    );
    if (providerAlreadyReviewed) {
      return { eligible: false, reason: "Esta reserva ya ha sido reseñada" };
    }

    return { eligible: true };
  } catch {
    return { eligible: false, reason: "Error inesperado al verificar la reserva" };
  }
}

// ── archiveBookingWithReview ──────────────────────────────────────────────────

export async function archiveBookingWithReview(
  bookingId: string,
  review: { rating: number; content: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No tienes permiso para esta reserva" };

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, owner_id, client_id, status")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "No tienes permiso para esta reserva" };
    }

    if (booking.owner_id !== user.id) {
      return { success: false, error: "No tienes permiso para esta reserva" };
    }

    const eligibility = await checkArchivingEligibility(bookingId);
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    const { error: reviewError } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      author_id: user.id,
      target_id: booking.client_id,
      rating: review.rating,
      content: review.content,
    });

    if (reviewError) {
      return { success: false, error: "No se pudo guardar la reseña" };
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "ARCHIVED", archived_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("owner_id", user.id);

    if (updateError) {
      return { success: false, error: "No se pudo archivar la reserva" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al archivar la reserva" };
  }
}
