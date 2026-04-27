import { getMyListings } from "@/services/listingsService";
import { getMyProviderProfile } from "@/services/providerService";
import { redirect } from "next/navigation";
import CatalogClient from "./CatalogClient";

export default async function MyListingsPage() {
  const provider = await getMyProviderProfile();

  if (!provider) {
    redirect("/become-a-provider");
  }

  const listings = await getMyListings();

  return <CatalogClient listings={listings} />;
}
