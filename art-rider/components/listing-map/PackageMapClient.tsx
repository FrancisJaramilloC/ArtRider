"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
} from "@/components/ui/map";
import MapLibreGL from "maplibre-gl";
import type { MapListing } from "./types";
import { DEFAULT_CENTER } from "./constants";
import { MapEffects } from "./hooks/MapEffects";
import { PricePill } from "./components/PricePill";
import { PopupCard } from "./components/PopupCard";

// ─── Fit-bounds child ─────────────────────────────────────────────────────────
// Vive dentro de <Map> para acceder al contexto y hacer fitBounds cuando carga.

function FitBoundsEffect({ listings }: { listings: MapListing[] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || listings.length === 0) return;

    if (listings.length === 1) {
      map.flyTo({
        center: [listings[0].address!.longitude, listings[0].address!.latitude],
        zoom: 13,
        duration: 600,
      });
      return;
    }

    const lngs = listings.map((l) => l.address!.longitude);
    const lats = listings.map((l) => l.address!.latitude);
    const bounds = new MapLibreGL.LngLatBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    );

    map.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      maxZoom: 14,
      duration: 700,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Variante del MapClient para la vista de detalle de un paquete.
 * Calcula automáticamente los límites para mostrar todos los equipos (fitBounds).
 */
export default function PackageMapClient({
  listings,
}: {
  listings: MapListing[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId]     = useState<string | null>(null);

  const validListings = useMemo(
    () => listings.filter((l) => l.address?.latitude != null && l.address?.longitude != null),
    [listings]
  );

  const initialCenter: [number, number] = useMemo(() => {
    if (validListings.length === 0) return DEFAULT_CENTER;
    return [validListings[0].address!.longitude, validListings[0].address!.latitude];
  }, [validListings]);

  if (validListings.length === 0) return null;

  return (
    <div className="w-full h-full relative">
      <Map
        theme="dark"
        center={initialCenter}
        zoom={12}
        className="w-full h-full"
      >
        <MapEffects />
        <FitBoundsEffect listings={validListings} />
        <MapControls position="bottom-right" showZoom showFullscreen />

        {validListings.map((listing) => {
          const isSelected = selectedId === listing.id;
          const isActive   = activeId   === listing.id;
          return (
            <MapMarker
              key={listing.id}
              longitude={listing.address!.longitude}
              latitude={listing.address!.latitude}
              onClick={() => setSelectedId((prev) => (prev === listing.id ? null : listing.id))}
              onMouseEnter={() => setActiveId(listing.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              <MarkerContent>
                <PricePill price={listing.daily_price} isActive={isActive || isSelected} />
              </MarkerContent>

              {isSelected && (
                <MarkerPopup>
                  <PopupCard listing={listing} />
                </MarkerPopup>
              )}
            </MapMarker>
          );
        })}
      </Map>
    </div>
  );
}
