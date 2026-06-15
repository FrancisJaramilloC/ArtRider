"use client";

import { useState } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MapControls,
} from "@/components/ui/map";
import type { MapListing } from "./types";
import { DEFAULT_CENTER } from "./constants";
import { MapEffects } from "./hooks/MapEffects";
import { PopupCard } from "./components/PopupCard";

// Componente principal
export default function MapClient({
  currentListing,
}: {
  currentListing: MapListing;
}) {
  //  Estados
  const [activeId, setActiveId] = useState<string | null>(currentListing.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  //  Toggle selected
  const toggleSelected = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  //  Coordenadas del listing actual
  const addrLng = currentListing.address?.longitude;
  const addrLat = currentListing.address?.latitude;
  const hasValidCoords =
    addrLng != null && addrLat != null && !(addrLng === 0 && addrLat === 0);

  //  Centro del mapa
  const centerCoords: [number, number] = hasValidCoords
    ? [addrLng, addrLat]
    : DEFAULT_CENTER;

  //  Renderizado del componente
  return (
    <div className="w-full h-full relative group">
      <Map
        theme="dark"
        center={centerCoords}
        zoom={14}
        className="w-full h-full"
      >
        {/* Efectos: labels mejorados (sin flyToUser) */}
        <MapEffects />

        {/* Controles del mapa */}
        <MapControls position="bottom-right" showZoom showFullscreen />

        {/* Marcador Principal (El equipo actual) */}
        {currentListing.address?.latitude && currentListing.address?.longitude && (
          <MapMarker
            longitude={currentListing.address.longitude}
            latitude={currentListing.address.latitude}
            onClick={() => toggleSelected(currentListing.id)}
            onMouseEnter={() => setActiveId(currentListing.id)}
            onMouseLeave={() => setActiveId(null)}
          >
            {/* Contenido del marcador */}
            <MarkerContent>
              <div
                className={`
                  w-4 h-4 rounded-full shadow-md transition-all duration-200
                  ${
                    activeId === currentListing.id || selectedId === currentListing.id
                      ? "bg-[#875B9A] scale-125 shadow-lg shadow-[#875B9A]/30 z-50 relative"
                      : "bg-[#875B9A]/90 hover:bg-[#875B9A] hover:scale-110"
                  }
                `}
              />
            </MarkerContent>
            {/* Tooltip del marcador */}
            <MarkerTooltip offset={20}>
              <p className="font-medium">{currentListing.title}</p>
              <p className="mt-0.5 opacity-70">Ubicación exacta</p>
            </MarkerTooltip>
            {/* Popup del marcador */}
            <MarkerPopup closeButton>
              <PopupCard listing={currentListing} />
            </MarkerPopup>
          </MapMarker>
        )}

      </Map>

      {/* Gradient fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-950/20"
        aria-hidden
      />
    </div>
  );
}
