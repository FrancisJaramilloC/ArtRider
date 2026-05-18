"use client";

import { useState, useMemo, useEffect } from "react";
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
import { PricePill } from "./components/PricePill";
import { PopupCard } from "./components/PopupCard";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MapClient({
  currentListing,
  nearbyListings,
}: {
  currentListing: MapListing;
  nearbyListings: MapListing[];
}) {
  const [activeId, setActiveId] = useState<string | null>(currentListing.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const validListings = useMemo(
    () => nearbyListings.filter((l) => l.address?.latitude != null && l.address?.longitude != null),
    [nearbyListings]
  );

  const toggleSelected = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const addrLng = currentListing.address?.longitude;
  const addrLat = currentListing.address?.latitude;
  const hasValidCoords =
    addrLng != null && addrLat != null && !(addrLng === 0 && addrLat === 0);
  const centerCoords: [number, number] = hasValidCoords
    ? [addrLng, addrLat]
    : DEFAULT_CENTER;

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
            <MarkerContent>
              <div
                className={`
                  px-3 py-1.5 rounded-full text-sm font-bold tracking-tight shadow-md transition-all duration-200
                  ${
                    activeId === currentListing.id || selectedId === currentListing.id
                      ? "bg-[#875B9A] text-white border-white scale-110 shadow-lg shadow-[#875B9A]/30 z-50 relative"
                      : "bg-[#875B9A]/90 text-white border border-[#875B9A] hover:bg-[#875B9A] hover:scale-105"
                  }
                `}
              >
                ${Math.round(currentListing.daily_price / 100)}
              </div>
            </MarkerContent>
            <MarkerTooltip offset={20}>
              <p className="font-medium">{currentListing.title}</p>
              <p className="mt-0.5 opacity-70">Ubicación exacta</p>
            </MarkerTooltip>
            <MarkerPopup closeButton>
              <PopupCard listing={currentListing} />
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Marcadores Secundarios (Equipos en la zona) */}
        {validListings.map((listing) => {
          if (listing.id === currentListing.id) return null;
          
          const isActive = activeId === listing.id || selectedId === listing.id;

          return (
            <MapMarker
              key={listing.id}
              longitude={listing.address.longitude}
              latitude={listing.address.latitude}
              onClick={() => toggleSelected(listing.id)}
              onMouseEnter={() => setActiveId(listing.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              <MarkerContent>
                <PricePill price={listing.daily_price} isActive={isActive} />
              </MarkerContent>

              <MarkerTooltip offset={20}>
                <p className="font-medium">{listing.title}</p>
                <p className="mt-0.5 opacity-70">{listing.address.city}</p>
              </MarkerTooltip>

              <MarkerPopup closeButton>
                <PopupCard listing={listing} />
              </MarkerPopup>
            </MapMarker>
          );
        })}
      </Map>

      {/* Gradient fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-950/20"
        aria-hidden
      />
    </div>
  );
}
