import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AdminLayoutClient from "./AdminLayoutClient";
import Navbar from "@/components/layout/Navbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  // Verificar rol admin desde app_metadata (inmutable por el usuario)
  const isAdmin = user.app_metadata?.role === "admin";
  if (!isAdmin) redirect("/");

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f4f7]">
      <Navbar initialUser={user} initialIsProvider={false} hideNavLinks />
      <div className="flex flex-1 pt-16">
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </div>
    </div>
  );
}
