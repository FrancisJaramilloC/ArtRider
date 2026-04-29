import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getMyProviderProfile } from "@/services/providerService";
import DashboardLayoutClient from "./DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const provider = await getMyProviderProfile();

  return (
    <DashboardLayoutClient provider={provider} initialUser={data?.user || null}>
      {children}
    </DashboardLayoutClient>
  );
}
