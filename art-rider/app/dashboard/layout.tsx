import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getMyProviderProfile } from "@/services/providerService";
import DashboardLayoutClient from "./DashboardLayoutClient";

// Layout principal del dashboard
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const provider = await getMyProviderProfile();

  // renderizado del layout del dashboard
  return (
    <DashboardLayoutClient provider={provider}>
      {children}
    </DashboardLayoutClient>
  );
}
