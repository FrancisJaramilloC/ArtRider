"use client";

import React, { useState, useMemo } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  MarkerTooltip,
} from "@/components/ui/map";
import type { Listing } from "@/services/listingsService";
import { PricePill } from "@/components/listing-map/components/PricePill";
import { PopupCard } from "@/components/listing-map/components/PopupCard";
import type { MapListing } from "@/components/listing-map/types";

interface ExploreMapProps {
  listings: Listing[];
  center?: [number, number]; // [lng, lat]
}

export default function ExploreMap({ listings, center }: ExploreMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Default to Loja, Ecuador if no center provided
  const mapCenter: [number, number] = center || [-79.20422, -3.99313];

  // Helper to safely extract MapListing format
  const getMapListing = (listing: any): MapListing | null => {
    const addr = Array.isArray(listing.address) ? listing.address[0] : listing.address;
    if (addr?.latitude != null && addr?.longitude != null) {
      return {
        id: listing.id,
        title: listing.title || "Equipo",
        category: listing.category || "other",
        daily_price: listing.daily_price,
        cover_image_url: listing.cover_image_url,
        address: {
          latitude: addr.latitude,
          longitude: addr.longitude,
          city: addr.city || "",
          state: addr.state || "",
        },
      };
    }
    return null;
  };

  const mapListings = useMemo(() => {
    return listings
      .map(getMapListing)
      .filter((l): l is MapListing => l !== null);
  }, [listings]);

  return (
    <div className="w-full h-full relative group bg-zinc-950">
      <Map
        theme="dark"
        center={mapCenter}
        zoom={12}
        className="w-full h-full"
      >
        {/* Gradient fade para que haga match con el estilo general */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-950/20 z-10"
          aria-hidden
        />

        <MapControls position="bottom-right" showZoom showFullscreen />

        {mapListings.map((listing) => {
          const isActive = activeId === listing.id;

          return (
            <MapMarker
              key={listing.id}
              longitude={listing.address.longitude}
              latitude={listing.address.latitude}
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
    </div>
  );
}
