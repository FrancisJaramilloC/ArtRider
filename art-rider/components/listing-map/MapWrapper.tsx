"use client";

import dynamic from "next/dynamic";

// MapLibre GL necesita el objeto window, así que cargamos dinámicamente
const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse [animation-delay:300ms]" />
        </div>
        <p className="text-sm text-zinc-500 font-medium">Cargando mapa...</p>
      </div>
    </div>
  ),
});

// Normaliza las relaciones anidadas de Supabase que a veces pueden ser arreglos
function normalizeListing(listing: any) {
  if (!listing) return listing;
  const address = Array.isArray(listing.address) ? listing.address[0] : listing.address;
  return { ...listing, address };
}

// Wrapper principal (maneja la data de Supabase)
export default function MapWrapper({ currentListing, nearbyListings }: any) {
  const safeCurrent = normalizeListing(currentListing);
  const safeNearby = (nearbyListings || []).map(normalizeListing);
  return <MapClient currentListing={safeCurrent} nearbyListings={safeNearby} />;
}
