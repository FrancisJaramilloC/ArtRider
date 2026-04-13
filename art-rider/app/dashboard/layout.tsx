import { getMyProviderProfile } from "@/services/providerService";
import DashboardLayoutClient from "./DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const provider = await getMyProviderProfile();
  
  return (
    <DashboardLayoutClient provider={provider}>
      {children}
    </DashboardLayoutClient>
  );
}
