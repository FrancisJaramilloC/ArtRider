import Navbar from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Metadata } from "next";

// Metadatos de la pagina
export const metadata: Metadata = {
  title: "Favoritos | ArtRider",
  description: "Equipos y servicios que has guardado para más tarde.",
};

// Layout principal de la pagina de favoritos
export default async function FavoritosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // renderizado del layout principal de la pagina de favoritos
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f8]">
      <Navbar initialUser={data?.user || null} />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {children}
      </main>
    </div>
  );
}
