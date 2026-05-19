import ProfileNav from "@/components/features/profile/ProfileNav";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Metadata } from "next";

//  Metadata de la pagina
export const metadata: Metadata = {
  title: "Cuenta | ArtRider",
  description: "Administra tu perfil, información pública y seguridad.",
};

// Layout de la pagina de perfil
export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">

      {/*  Barra de navegacion global  */}
      <Navbar initialUser={data?.user || null} />

      {/*  Contenido principal  */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex flex-col md:flex-row gap-10 lg:gap-14 w-full flex-1">

        {/*  Navegacion lateral izquierda  */}
        <aside className="w-full md:w-64 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 hidden md:block tracking-tight">
            Cuenta
          </h1>
          <ProfileNav />
        </aside>

        {/*  Area de contenido principal  */}
        <main className="flex-1 max-w-2xl min-w-0">
          {children}
        </main>

      </div>

      {/*  Footer  */}
      <Footer />
    </div>
  );
}
