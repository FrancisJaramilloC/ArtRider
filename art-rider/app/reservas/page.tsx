import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getClientBookings } from "@/services/bookingsService";
import Navbar from "@/components/layout/Navbar";
import LandingFooter from "@/components/features/home/LandingFooter";
import ReservasClient from "./ReservasClient";

export const metadata: Metadata = {
  title: "Mis Reservas | ArtRider",
  description: "Consulta y gestiona los equipos que has alquilado en ArtRider.",
};

export const revalidate = 0;

export default async function ReservasPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/reservas");

  const bookings = await getClientBookings();

  // Fetch provider brand names in bulk
  const providerIds = [...new Set(bookings.map(b => b.provider_id))];
  let providerNames: Record<string, string> = {};
  if (providerIds.length) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("providers")
      .select("id, brand_name")
      .in("id", providerIds);
    for (const p of data ?? []) {
      providerNames[p.id] = p.brand_name ?? "Proveedor ArtRider";
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar initialUser={user} />
      <ReservasClient bookings={bookings} providerNames={providerNames} />
      <LandingFooter />
    </div>
  );
}
