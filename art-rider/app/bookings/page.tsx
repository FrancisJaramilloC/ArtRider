import { getClientBookings } from "@/services/bookingsService";
import { getClientSentReviews } from "@/services/reviewService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import BookingsView from "@/components/features/bookings/BookingsView";

export default async function BookingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [clientBookings, sentReviews] = await Promise.all([
    getClientBookings(),
    user ? getClientSentReviews(user.id) : Promise.resolve([]),
  ]);

  return (
    <BookingsView
      clientBookings={clientBookings}
      sentReviews={sentReviews}
    />
  );
}
