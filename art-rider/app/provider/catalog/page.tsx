import { getMyListings } from "@/services/listingsService";
import { getMyPackages } from "@/services/packagesService";
import { getMyProviderProfile } from "@/services/providerService";
import { redirect } from "next/navigation";
import CatalogClient from "./CatalogClient";

//  Pagina principal de catalogos
export default async function MyListingsPage() {
  const provider = await getMyProviderProfile();
  if (!provider) redirect("/become-a-provider");

  //  Obtener los equipos y paquetes del proveedor
  const [listings, packages] = await Promise.all([
    getMyListings(),
    getMyPackages(),
  ]);

  return <CatalogClient listings={listings} packages={packages} />;
}
