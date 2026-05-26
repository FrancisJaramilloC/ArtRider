"use client";

import dynamic from "next/dynamic";
import type { MapListing } from "./types";

const PackageMapClient = dynamic(() => import("./PackageMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-zinc-950 flex items-center justify-center rounded-2xl">
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

/**
 * Wrapper SSR-safe para el mapa de paquetes con auto-zoom.
 * Acepta todos los listings del paquete con coordenadas válidas.
 */
export default function PackageMapWrapper({ listings }: { listings: MapListing[] }) {
  return <PackageMapClient listings={listings} />;
}
