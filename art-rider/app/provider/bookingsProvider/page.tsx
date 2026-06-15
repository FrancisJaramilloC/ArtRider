import { getProviderBookings } from "@/services/bookingsService";
import { getMyProviderProfile } from "@/services/providerService";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import ProviderBookingsClient from "./ProviderBookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsProviderPage() {
  const [bookings, provider] = await Promise.all([
    getProviderBookings(),
    getMyProviderProfile(),
  ]);

  // Fetch avg rating for the provider
  let avgRating = 0;
  let reviewCount = 0;
  if (provider?.user_id) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: reviews } = await admin
        .from("reviews")
        .select("rating")
        .eq("target_id", provider.user_id);
      if (reviews?.length) {
        reviewCount = reviews.length;
        avgRating = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount;
      }
    } catch { /* silent */ }
  }

  return (
    <ProviderBookingsClient
      bookings={bookings}
      avgRating={avgRating}
      reviewCount={reviewCount}
    />
  );
}
