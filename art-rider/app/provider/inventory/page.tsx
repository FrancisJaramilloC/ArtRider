import { redirect } from "next/navigation";
import { getMyProviderProfile } from "@/services/providerService";
import { getMyListings } from "@/services/listingsService";
import { getMyPackages } from "@/services/packagesService";
import InventoryClient from "./InventoryClient";

export default async function InventoryPage() {
  const provider = await getMyProviderProfile();
  if (!provider) redirect("/become-a-provider");

  const [listings, packages] = await Promise.all([
    getMyListings(),
    getMyPackages(),
  ]);

  return (
    <InventoryClient
      initialListings={listings}
      initialPackages={packages}
    />
  );
}
