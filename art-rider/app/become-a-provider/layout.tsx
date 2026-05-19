import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getMyProviderProfile } from "@/services/providerService";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

// metadatos de la pagina de registro
export const metadata: Metadata = {
  title: "Conviértete en Proveedor | ArtRider",
  description: "Únete a ArtRider y comienza a ganar dinero alquilando tus equipos audiovisuales a otros creadores.",
};

// layout principal de la pagina de registro
export default async function BecomeProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // Si el usuario ya está autenticado y ya es proveedor, redirigirlo a su panel.
  if (data?.user) {
    const profile = await getMyProviderProfile();
    if (profile) {
      redirect("/provider");
    }
  }

  // renderizado del layout principal de la pagina de registro
  return (
    <>
      <Navbar initialUser={data?.user || null} />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
