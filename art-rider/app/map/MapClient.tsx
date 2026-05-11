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
import Navbar from "@/components/layout/Navbar";

import type { MapListing } from "./types";
import { DEFAULT_CENTER } from "./constants";
import { MapEffects } from "./hooks/MapEffects";
import { PricePill } from "./components/PricePill";
import { ListingRow } from "./components/ListingRow";
import { PopupCard } from "./components/PopupCard";
import { EmptyState } from "./components/EmptyState";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MapClient({ initialListings }: { initialListings: MapListing[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const validListings = useMemo(
    () => initialListings.filter((l) => l.address?.latitude != null && l.address?.longitude != null),
    [initialListings]
  );

  const toggleSelected = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  // Scroll automático al listing seleccionado en el panel lateral
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`listing-${selectedId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [selectedId]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row relative">
        {/* ── Panel izquierdo: Lista ── */}
        <div className="w-full md:w-[360px] lg:w-[400px] bg-zinc-950 h-[40vh] md:h-full overflow-y-auto border-r border-zinc-800/60 z-10 flex flex-col">
          <div className="p-5 border-b border-zinc-800/60 sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-20">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Cerca de ti
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {validListings.length}{" "}
              {validListings.length === 1 ? "equipo encontrado" : "equipos encontrados"}
            </p>
          </div>

          <div className="p-3 flex flex-col gap-0.5">
            {validListings.map((listing) => (
              <div key={listing.id} id={`listing-${listing.id}`}>
                <ListingRow
                  listing={listing}
                  isActive={activeId === listing.id || selectedId === listing.id}
                  onHover={() => setActiveId(listing.id)}
                  onLeave={() => setActiveId(null)}
                  onClick={() => toggleSelected(listing.id)}
                />
              </div>
            ))}

            {validListings.length === 0 && <EmptyState />}
          </div>
        </div>

        {/* ── Panel derecho: Mapa (mapcn Dark Matter) ── */}
        <div className="flex-1 h-[60vh] md:h-full relative z-0">
          <Map theme="dark" center={DEFAULT_CENTER} zoom={12} className="w-full h-full">
            {/* Efectos: geolocalización + labels mejorados */}
            <MapEffects />

            <MapControls position="bottom-right" showZoom showLocate showFullscreen />

            {validListings.map((listing) => {
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

          {/* Gradient fade — estilo mapcn analytics-map */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-zinc-950/30 to-zinc-950"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
