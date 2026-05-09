import { createSupabaseServerClient } from "@/lib/supabaseServer";
import BookingCalendar from "@/components/features/bookings/BookingCalendar";

export default async function ClientBookingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return <BookingCalendar initialUser={data?.user ?? null} />;
}
