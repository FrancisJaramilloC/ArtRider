"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type ReviewWithMeta = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name: string | null;
  reviewer_avatar: string | null;
  listing_title: string | null;
};

export type SentReviewWithMeta = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  listing_title: string | null;
  provider_name: string | null;
};

/** Cliente deja reseña sobre el proveedor tras completar su reserva */
export async function createClientReview(
  bookingId: string,
  review: { rating: number; content: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, client_id, provider_id, status, reviews(id, author_id)")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking)
      return { success: false, error: "Reserva no encontrada" };
    if (booking.client_id !== user.id)
      return { success: false, error: "Sin permiso" };
    if (booking.status !== "COMPLETED")
      return { success: false, error: "La reserva debe estar completada" };

    const alreadyReviewed = (booking.reviews ?? []).some(
      (r: any) => r.author_id === user.id
    );
    if (alreadyReviewed)
      return { success: false, error: "Ya dejaste una reseña para esta reserva" };

    // Obtener user_id del proveedor para usarlo como target_id (FK a profiles)
    const { data: provider } = await supabase
      .from("providers")
      .select("user_id")
      .eq("id", booking.provider_id)
      .single();

    if (!provider?.user_id)
      return { success: false, error: "No se encontró el proveedor" };

    // Admin bypasa RLS — validación ya ocurrió arriba
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    const adminSupabase = createSupabaseAdminClient();
    const { error: reviewError } = await adminSupabase.from("reviews").insert({
      booking_id: bookingId,
      author_id: user.id,
      target_id: provider.user_id,
      rating: review.rating,
      comment: review.content,
    });

    if (reviewError) return { success: false, error: reviewError.message };
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

/** Promedio de rating de un cliente (recibido de proveedores) */
export async function getClientAverageRating(clientUserId: string): Promise<number> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("reviews")
      .select("rating")
      .eq("target_id", clientUserId);
    if (!data?.length) return 0;
    return data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  } catch {
    return 0;
  }
}

/** Conteo de reseñas recibidas por un cliente */
export async function getClientReviewCount(clientUserId: string): Promise<number> {
  try {
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("target_id", clientUserId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Reseñas enviadas por el cliente (autor) — para /bookings */
export async function getClientSentReviews(clientUserId: string): Promise<SentReviewWithMeta[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: reviews } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, booking_id, target_id")
      .eq("author_id", clientUserId)
      .order("created_at", { ascending: false });

    if (!reviews?.length) return [];

    // Resolver nombres de proveedores (target_id = provider user_id)
    const targetIds = [...new Set(reviews.map((r: any) => r.target_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", targetIds);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

    // Resolver títulos via bookings
    const bookingIds = reviews.map((r: any) => r.booking_id).filter(Boolean);
    let titleMap: Record<string, string> = {};
    if (bookingIds.length) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`id, snapshot_listing, booking_units(equipment_unit:equipment_units(listing:listings(title)))`)
        .in("id", bookingIds);
      for (const b of bookings ?? []) {
        const fromSnapshot = (b.snapshot_listing as any)?.title;
        const fromUnit = (b as any).booking_units?.[0]?.equipment_unit?.listing?.title;
        const title = fromSnapshot ?? fromUnit ?? null;
        if (title) titleMap[b.id] = title;
      }
    }

    return reviews.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? "",
      created_at: r.created_at,
      listing_title: r.booking_id ? (titleMap[r.booking_id] ?? "Equipo reservado") : "Equipo reservado",
      provider_name: profileMap[r.target_id] ?? null,
    }));
  } catch {
    return [];
  }
}

/** Promedio de ratings para un conjunto de proveedores (por user_id) */
async function getReviewsByTargetIds(
  targetIds: string[]
): Promise<{ target_id: string; rating: number }[]> {
  if (!targetIds.length) return [];
  const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select("target_id, rating")
    .in("target_id", targetIds);
  return (data ?? []) as { target_id: string; rating: number }[];
}

/** Promedio de rating por listing — usado en homepage cards (promedio por equipo, no por proveedor) */
export async function getAverageRatingForListings(
  listingIds: string[]
): Promise<Record<string, number>> {
  if (!listingIds.length) return {};
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    const supabase = createSupabaseAdminClient();

    // 1. provider.user_id para cada listing (necesario para filtrar reviews cliente→proveedor)
    const { data: listings } = await supabase
      .from("listings")
      .select("id, provider_id")
      .in("id", listingIds);
    if (!listings?.length) return {};

    const providerIds = [...new Set(listings.map((l) => l.provider_id))];
    const { data: providers } = await supabase
      .from("providers")
      .select("id, user_id")
      .in("id", providerIds);
    if (!providers?.length) return {};

    const providerUserIds = providers.map((p) => p.user_id).filter(Boolean);

    // 2. Todas las reseñas de clientes a estos proveedores
    const { data: reviews } = await supabase
      .from("reviews")
      .select("id, rating, booking_id, target_id")
      .in("target_id", providerUserIds);
    if (!reviews?.length) return {};

    // 3. Resolver booking_id → listing_id via snapshot_listing Y booking_units
    const bookingIds = [...new Set(reviews.map((r: any) => r.booking_id).filter(Boolean))];
    if (!bookingIds.length) return {};

    const [{ data: bookings }, { data: bookingUnits }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, snapshot_listing")
        .in("id", bookingIds),
      supabase
        .from("booking_units")
        .select("booking_id, equipment_unit:equipment_units(listing_id)")
        .in("booking_id", bookingIds),
    ]);

    const bookingToListing: Record<string, string> = {};
    const listingIdSet = new Set(listingIds);

    for (const b of bookings ?? []) {
      const sid = (b.snapshot_listing as any)?.id;
      if (sid && listingIdSet.has(sid)) bookingToListing[b.id] = sid;
    }
    for (const bu of bookingUnits ?? []) {
      const lid = (bu as any).equipment_unit?.listing_id;
      if (lid && listingIdSet.has(lid)) bookingToListing[(bu as any).booking_id] = lid;
    }

    // 4. Acumular por listing_id
    const acc: Record<string, { sum: number; count: number }> = {};
    for (const r of reviews as any[]) {
      const lid = r.booking_id ? bookingToListing[r.booking_id] : null;
      if (!lid) continue;
      if (!acc[lid]) acc[lid] = { sum: 0, count: 0 };
      acc[lid].sum += r.rating;
      acc[lid].count += 1;
    }

    return Object.fromEntries(
      Object.entries(acc).map(([id, { sum, count }]) => [id, sum / count])
    );
  } catch {
    return {};
  }
}

/** Promedio global de un proveedor */
export async function getAverageRatingForProvider(
  providerUserId: string
): Promise<number> {
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("reviews")
      .select("rating")
      .eq("target_id", providerUserId);

    if (!data?.length) return 0;
    return data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  } catch {
    return 0;
  }
}

/** Reseñas recibidas por el proveedor — para /provider/reviews */
export async function getProviderReviews(
  providerUserId: string
): Promise<ReviewWithMeta[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: reviews } = await supabase
      .from("reviews")
      .select(
        "id, rating, comment, created_at, booking_id, author_id, profiles!author_id(full_name, avatar_url)"
      )
      .eq("target_id", providerUserId)
      .order("created_at", { ascending: false });

    if (!reviews?.length) return [];

    // Obtener títulos via booking → snapshot_listing o booking_units → listings
    const bookingIds = reviews.map((r: any) => r.booking_id).filter(Boolean);
    let bookingTitleMap: Record<string, string> = {};

    if (bookingIds.length) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          id, snapshot_listing,
          booking_units(
            equipment_unit:equipment_units(
              listing:listings(title)
            )
          )
        `)
        .in("id", bookingIds);

      for (const b of bookings ?? []) {
        const fromSnapshot = (b.snapshot_listing as any)?.title;
        const fromUnit = (b as any).booking_units?.[0]?.equipment_unit?.listing?.title;
        const title = fromSnapshot ?? fromUnit ?? null;
        if (title) bookingTitleMap[b.id] = title;
      }
    }

    return reviews.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? "",
      created_at: r.created_at,
      reviewer_name: r.profiles?.full_name ?? null,
      reviewer_avatar: r.profiles?.avatar_url ?? null,
      listing_title: r.booking_id ? (bookingTitleMap[r.booking_id] ?? "Equipo reservado") : "Equipo reservado",
    }));
  } catch {
    return [];
  }
}
