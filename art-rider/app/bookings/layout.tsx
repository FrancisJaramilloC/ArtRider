import Navbar from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservas | ArtRider",
  description: "Gestiona tus alquileres de equipos de audio e iluminación.",
};

export default async function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f8]">
      <Navbar initialUser={data?.user || null} />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {children}
      </main>
    </div>
  );
}
