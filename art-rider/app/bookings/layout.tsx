import Navbar from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// metadata de la pagina de reservas
export const metadata: Metadata = {
  title: "Reservas | ArtRider",
  description: "Gestiona tus alquileres de equipos de audio e iluminación.",
};

// layout principal de la pagina de reservas
export default async function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // renderizado del layout principal de la pagina de reservas
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f8]">
      <Navbar initialUser={data?.user || null} hideNavLinks />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </Link>
        {children}
      </main>
    </div>
  );
}
