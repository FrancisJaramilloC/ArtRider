import { getAdminListings } from "@/services/adminService";
import EquiposClient from "./EquiposClient";

export default async function EquiposPage() {
  const listings = await getAdminListings();
  return <EquiposClient initialListings={listings} />;
}
