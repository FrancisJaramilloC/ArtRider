import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conviértete en Proveedor | ArtRider",
  description: "Únete a ArtRider y comienza a ganar dinero alquilando tus equipos audiovisuales a otros creadores.",
};

export default async function BecomeProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return (
    <>
      <Navbar initialUser={data?.user || null} />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
