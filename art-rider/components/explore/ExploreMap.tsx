"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Map, MapMarker, MarkerContent, MarkerPopup, MapControls, MarkerTooltip,
} from "@/components/ui/map";
import type { Listing } from "@/services/listingsService";
import { PopupCard } from "@/components/listing-map/components/PopupCard";
import type { MapListing } from "@/components/listing-map/types";
import { ShieldCheck } from "lucide-react";

// ── Price pin with three visual states ────────────────────────────────────────
function PricePin({
  price, isHovered, isSelected,
}: {
  price: number;
  isHovered: boolean;
  isSelected: boolean;
}) {
  const label = `$${(price / 100).toFixed(0)}`;

  if (isSelected) {
    return (
      <div className="px-3 py-1.5 rounded-full font-extrabold text-[13px] leading-none whitespace-nowrap cursor-pointer
        bg-[#875B9A] text-white scale-[1.28]
        shadow-[0_0_0_5px_rgba(135,91,154,0.28),0_8px_22px_-4px_rgba(135,91,154,0.75)]
        transition-all duration-200">
        {label}
      </div>
    );
  }
  if (isHovered) {
    return (
      <div className="px-3 py-1.5 rounded-full font-extrabold text-[13px] leading-none whitespace-nowrap cursor-pointer
        bg-[#875B9A] text-white scale-[1.14]
        shadow-[0_6px_18px_-2px_rgba(135,91,154,0.7)]
        transition-all duration-200">
        {label}
      </div>
    );
  }
  return (
    <div className="px-3 py-1.5 rounded-full font-extrabold text-[13px] leading-none whitespace-nowrap cursor-pointer
      bg-white text-gray-900
      shadow-[0_3px_10px_rgba(0,0,0,0.4)]
      hover:scale-[1.1] hover:bg-[#875B9A] hover:text-white
      transition-all duration-150">
      {label}
    </div>
  );
}

// ── Main map component ─────────────────────────────────────────────────────────
interface ExploreMapProps {
  listings: Listing[];
  center?: [number, number];
  displayCity?: string;
  hoveredId?: string | null;
  selectedId?: string | null;
  onHover?: (id: string) => void;
  onLeave?: () => void;
  onSelect?: (id: string) => void;
}

export default function ExploreMap({
  listings, center, displayCity = "Ecuador",
  hoveredId, selectedId,
  onHover, onLeave, onSelect,
}: ExploreMapProps) {
  // Default center: Loja, Ecuador
  const mapCenter: [number, number] = center ?? [-79.20422, -3.99313];

  const mapListings = useMemo((): MapListing[] => {
    return listings
      .filter(l => {
        const addr = Array.isArray(l.address) ? l.address[0] : l.address;
        return addr?.latitude != null && addr?.longitude != null;
      })
      .map(l => {
        const addr = Array.isArray(l.address) ? l.address[0] : l.address;
        return {
          id: l.id,
          title: l.title || "Equipo",
          category: l.category || "other",
          daily_price: l.daily_price,
          cover_image_url: l.cover_image_url ?? null,
          address: {
            latitude: addr!.latitude,
            longitude: addr!.longitude,
            city: addr!.city || "",
            state: addr!.state || "",
          },
        };
      });
  }, [listings]);

  return (
    <div className="w-full h-full relative bg-[#15131d]">
      <Map
        theme="dark"
        center={mapCenter}
        zoom={12}
        className="w-full h-full"
      >
        <MapControls position="bottom-right" showZoom showFullscreen />

        {mapListings.map(listing => {
          const isHov = hoveredId === listing.id;
          const isSel = selectedId === listing.id;

          return (
            <MapMarker
              key={listing.id}
              longitude={listing.address.longitude}
              latitude={listing.address.latitude}
              onMouseEnter={() => onHover?.(listing.id)}
              onMouseLeave={() => onLeave?.()}
              onClick={() => onSelect?.(listing.id)}
            >
              <MarkerContent>
                <PricePin
                  price={listing.daily_price}
                  isHovered={isHov}
                  isSelected={isSel}
                />
              </MarkerContent>

              <MarkerTooltip offset={20}>
                <p className="font-semibold">{listing.title}</p>
                <p className="mt-0.5 opacity-70">{listing.address.city}</p>
              </MarkerTooltip>

              <MarkerPopup closeButton>
                <PopupCard listing={listing} />
              </MarkerPopup>
            </MapMarker>
          );
        })}
      </Map>

      {/* Badge: equipos verificados */}
      <div className="absolute left-4 top-4 z-[600] flex items-center gap-1.5 px-3.5 py-2 rounded-full
        bg-black/70 backdrop-blur-md text-white text-[12px] font-semibold
        border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,.35)]">
        <ShieldCheck size={14} className="text-[#d18de8]" />
        Equipos verificados ·{" "}
        <strong className="font-bold">{displayCity}</strong>
      </div>

      {/* Buscar en esta zona */}
      <button className="absolute left-1/2 -translate-x-1/2 top-4 z-[600]
        px-4 py-2.5 rounded-full bg-white text-gray-900 text-[12.5px] font-bold
        shadow-[0_8px_24px_-6px_rgba(0,0,0,.5)] border border-black/5
        hover:scale-105 active:scale-95 transition-transform">
        Buscar en esta zona
      </button>
    </div>
  );
}
