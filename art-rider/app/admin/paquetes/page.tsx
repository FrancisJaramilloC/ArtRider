import { getAdminPackages } from "@/services/adminService";
import PaquetesClient from "./PaquetesClient";

export default async function PaquetesPage() {
  const packages = await getAdminPackages();
  return <PaquetesClient initialPackages={packages} />;
}
