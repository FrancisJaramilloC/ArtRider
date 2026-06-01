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
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar initialUser={data?.user || null} />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
