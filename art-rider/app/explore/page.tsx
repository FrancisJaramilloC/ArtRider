import type { Metadata } from "next";
import { getListings } from "@/services/listingsService";
import ListingCard from "@/components/features/listings/ListingCard";
import ExploreMap from "@/components/explore/ExploreMap";

export const metadata: Metadata = {
  title: "Explorar Equipos | ArtRider",
  description: "Explora equipos de alquiler en el mapa interactivo.",
};

export default async function ExplorePage(props: {
  searchParams: Promise<{ city?: string }>;
}) {
  const searchParams = await props.searchParams;
  const city = searchParams.city;
  const allListings = await getListings();

  // Filter listings by city if provided
  const listings = city
    ? allListings.filter((l: any) => {
        const addr = Array.isArray(l.address) ? l.address[0] : l.address;
        const listingCity = addr?.city?.trim() || "Otras ubicaciones";
        return listingCity === city;
      })
    : allListings;

  // Calculate default center for the map based on available listings
  let mapCenter: [number, number] | undefined = undefined;
  const listingWithCoords = listings.find((l: any) => {
    const addr = Array.isArray(l.address) ? l.address[0] : l.address;
    return addr?.latitude != null && addr?.longitude != null;
  });
  
  if (listingWithCoords) {
    const addr = Array.isArray((listingWithCoords as any).address) 
      ? (listingWithCoords as any).address[0] 
      : (listingWithCoords as any).address;
    mapCenter = [addr.longitude, addr.latitude];
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Top Navigation — global BackButton already provides the back arrow */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-center bg-white z-10 relative shadow-sm">
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">
            {city ? `Equipos en ${city}` : "Todos los equipos"}
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            {listings.length} {listings.length === 1 ? "equipo" : "equipos"}
          </p>
        </div>
      </header>

      {/* Split Screen Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Scrollable List */}
        <div className="w-full lg:w-[600px] xl:w-[700px] flex-shrink-0 overflow-y-auto px-6 py-8 pb-32">
          {listings.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-4xl">📍</span>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">No hay resultados</h2>
              <p className="mt-2 text-gray-500">Prueba buscando en otra ciudad o explorando el mapa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Sticky Map (Hidden on very small screens, though we can make a mobile view toggle later) */}
        <div className="hidden lg:block flex-1 relative bg-gray-100 border-l border-gray-200">
          <ExploreMap listings={listings} center={mapCenter} />
        </div>
        
      </div>
    </div>
  );
}
