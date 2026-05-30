import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import SuccessRevealClient from "@/components/features/bookings/SuccessRevealClient";

interface PageProps {
  searchParams: {
    id?: string;
  };
}

export default async function SuccessBookingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { id: bookingId } = params;

  if (!bookingId) {
    redirect("/explore");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch booking details
  const { data: booking } = await supabase
    .from("bookings")
    .select("provider_id, client_id")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.client_id !== user.id) {
    redirect("/explore");
  }

  // Fetch provider info
  const { data: provider } = await supabase
    .from("providers")
    .select("brand_name, user_id")
    .eq("id", booking.provider_id)
    .single();

  // Fetch provider profile for avatar and phone
  let providerAvatar = null;
  let providerPhone = null;

  if (provider?.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, phone")
      .eq("id", provider.user_id)
      .single();
    
    if (profile) {
      providerAvatar = profile.avatar_url;
      providerPhone = profile.phone;
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAFC] py-10">
      <SuccessRevealClient
        providerName={provider?.brand_name || "Proveedor"}
        providerAvatar={providerAvatar}
        providerPhone={providerPhone}
      />
    </main>
  );
}
