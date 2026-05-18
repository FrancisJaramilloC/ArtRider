import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { Suspense } from "react";
import { getListings } from "@/services/listingsService";
import ExploreFilterBar from "@/components/explore/ExploreFilterBar";
import ExploreCard from "@/components/explore/ExploreCard";
import ExploreMap from "@/components/explore/ExploreMap";

export const metadata: Metadata = {
  title: "Explorar Equipos | ArtRider",
  description: "Explora equipos de alquiler en el mapa interactivo.",
};

export default async function ExplorePage(props: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const searchParams = await props.searchParams;
  const city = searchParams.city;
  const category = searchParams.category ?? "all";
  const allListings = await getListings();

  // Filter by city and/or category
  const listings = allListings.filter((l: any) => {
    const addr = Array.isArray(l.address) ? l.address[0] : l.address;
    const listingCity = addr?.city?.trim() || "Otras ubicaciones";

    const cityOk = !city || listingCity === city;
    const catOk  = !category || category === "all" || l.category === category;

    return cityOk && catOk;
  });

  // Derive map center from first listing with valid coordinates
  let mapCenter: [number, number] | undefined = undefined;
  const seed = listings.find((l: any) => {
    const addr = Array.isArray(l.address) ? l.address[0] : l.address;
    return addr?.latitude != null && addr?.longitude != null;
  });
  if (seed) {
    const addr = Array.isArray((seed as any).address)
      ? (seed as any).address[0]
      : (seed as any).address;
    mapCenter = [addr.longitude, addr.latitude];
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">

      {/* ── Body: split 55 / 45 ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left 55%: catálogo scrollable ── */}
        <div className="w-full lg:w-[55%] h-full overflow-y-auto shrink-0 bg-white">

          {/* Barra de filtros — debajo del BackButton */}
          <div className="mt-14 sticky top-0 z-10 bg-white">
            <Suspense>
              <ExploreFilterBar city={city} />
            </Suspense>
          </div>

          {listings.length === 0 ? (

            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-10">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <MapPin size={17} strokeWidth={1.5} className="text-gray-400" />
              </div>
              <h2 className="text-[14px] font-semibold text-gray-900">Sin resultados</h2>
              <p className="text-[12.5px] text-gray-500 max-w-[200px] leading-relaxed">
                Prueba explorando otra ciudad o cambia los filtros.
              </p>
            </div>

          ) : (

            <div className="px-6 pt-5 pb-24">

              {/* Grid 2 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-7">
                {listings.map((listing) => (
                  <ExploreCard key={listing.id} listing={listing} />
                ))}
              </div>

            </div>
          )}
        </div>

        {/* ── Right 45%: mapa sticky con contorno izquierdo ── */}
        <div
          className="hidden lg:block flex-1 h-full relative"
          style={{ boxShadow: "inset 6px 0 10px -6px rgba(0,0,0,0.10)" }}
        >
          <ExploreMap listings={listings} center={mapCenter} />
        </div>

      </div>
    </div>
  );
}
