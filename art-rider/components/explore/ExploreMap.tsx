"use client";

import React, { useState, useMemo } from "react";
import {Map,MapMarker,MarkerContent,MarkerPopup,MapControls,MarkerTooltip,} from "@/components/ui/map";
import type { Listing } from "@/services/listingsService";
import { PricePill } from "@/components/listing-map/components/PricePill";
import { PopupCard } from "@/components/listing-map/components/PopupCard";
import type { MapListing } from "@/components/listing-map/types";

//  Interfaz de props del mapa
interface ExploreMapProps {
  listings: Listing[];
  center?: [number, number]; // [lng, lat]
}

//  Renderizado del mapa con los marcadores de los equipos
export default function ExploreMap({ listings, center }: ExploreMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  //  Centro del mapa por defecto: Loja, Ecuador
  const mapCenter: [number, number] = center || [-79.20422, -3.99313];

  //  Helper para extraer el formato MapListing de forma segura
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

  //  Mapeo de los equipos para el mapa y filtrado de los equipos que no tienen coordenadas
  const mapListings = useMemo(() => {
    return listings
      .map(getMapListing)
      .filter((l): l is MapListing => l !== null);
  }, [listings]);

  //  Renderizado del mapa
  return (
    <div className="w-full h-full relative group bg-zinc-950">
      <Map
        theme="dark"
        center={mapCenter}
        zoom={12}
        className="w-full h-full"
      >
        {/* Fade de gradiente para que coincida con el estilo general */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-950/20 z-10"
          aria-hidden
        />

        {/* Controles del mapa  */}
        <MapControls position="bottom-right" showZoom showFullscreen />

        {/*  Renderizado de los marcadores de los equipos */}
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

              {/* Precio del equipo  */}
              <MarkerContent>
                <PricePill price={listing.daily_price} isActive={isActive} />
              </MarkerContent>

              {/* Tooltip del equipo  */}
              <MarkerTooltip offset={20}>
                <p className="font-medium">{listing.title}</p>
                <p className="mt-0.5 opacity-70">{listing.address.city}</p>
              </MarkerTooltip>

              {/* Popup del equipo  */}
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
