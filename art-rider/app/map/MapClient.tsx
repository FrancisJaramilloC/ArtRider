"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MapControls,
} from "@/components/ui/map";
import Navbar from "@/components/layout/Navbar";
import Image from "next/image";

// ── FlyToUser: centra el mapa en la ubicación real del usuario al cargar ────

function FlyToUser() {
  const { map, isLoaded } = useMap();
  const [hasFlown, setHasFlown] = useState(false);

  useEffect(() => {
    if (!map || !isLoaded || hasFlown) return;
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1800,
        });
        setHasFlown(true);
      },
      () => {
        // Permiso denegado o error — se queda en el centro por defecto
        setHasFlown(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [map, isLoaded, hasFlown]);

  return null;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type MapListing = {
  id: string;
  title: string;
  category: string;
  daily_price: number;
  cover_image_url: string | null;
  address: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido",
  lighting: "Iluminación",
  video: "Video",
  effects: "Efectos",
  other: "Otro",
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

// ── Price Pill (marker content) ────────────────────────────────────────────────

function PricePill({ price, isActive }: { price: number; isActive: boolean }) {
  return (
    <div
      className={`
        px-3 py-1.5 rounded-full font-bold text-[13px] leading-none
        whitespace-nowrap border transition-all duration-150 ease-out
        ${
          isActive
            ? "bg-white text-zinc-900 border-white scale-105 shadow-lg shadow-white/20"
            : "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-md hover:bg-zinc-700"
        }
      `}
    >
      {formatPrice(price)}
    </div>
  );
}

// ── Listing Row (panel izquierdo) ──────────────────────────────────────────────

function ListingRow({
  listing,
  isActive,
  onHover,
  onLeave,
  onClick,
}: {
  listing: MapListing;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`w-full flex gap-3 rounded-xl text-left cursor-pointer transition-all duration-200 group p-2.5 ${
        isActive
          ? "bg-zinc-800/80 ring-1 ring-zinc-700"
          : "hover:bg-zinc-800/50"
      }`}
    >
      <div className="w-24 h-[68px] bg-zinc-800 rounded-lg overflow-hidden relative shrink-0">
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 justify-center min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5">
          {CATEGORY_LABELS[listing.category] ?? listing.category}
        </span>
        <h3 className="text-sm font-medium text-zinc-100 leading-tight mb-1 line-clamp-2">
          {listing.title}
        </h3>
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold text-white">
            {formatPrice(listing.daily_price)}
            <span className="text-xs font-normal text-zinc-500"> /día</span>
          </p>
          <p className="text-[11px] text-zinc-500 truncate ml-2">{listing.address.city}</p>
        </div>
      </div>
    </button>
  );
}

// ── Popup Card ─────────────────────────────────────────────────────────────────

function PopupCard({ listing }: { listing: MapListing }) {
  return (
    <div className="w-56">
      {listing.cover_image_url ? (
        <div className="relative h-28 -mx-3 -mt-3 mb-3 overflow-hidden">
          <Image
            src={listing.cover_image_url}
            alt={listing.title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-28 -mx-3 -mt-3 mb-3 bg-zinc-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
      )}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
        {CATEGORY_LABELS[listing.category] ?? listing.category}
      </p>
      <h3 className="text-sm font-semibold text-zinc-100 leading-tight line-clamp-2 mb-2">
        {listing.title}
      </h3>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-bold text-white">
          {formatPrice(listing.daily_price)}
          <span className="text-xs font-normal text-zinc-500"> /día</span>
        </span>
        <span className="text-[11px] text-zinc-500">{listing.address.city}</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MapClient({ initialListings }: { initialListings: MapListing[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const validListings = useMemo(() => {
    return initialListings.filter(
      (l) => l.address && l.address.latitude != null && l.address.longitude != null
    );
  }, [initialListings]);

  const defaultCenter: [number, number] = [-78.467838, -0.180653];

  const handleMarkerClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`listing-${selectedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
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
                  onClick={() => handleMarkerClick(listing.id)}
                />
              </div>
            ))}

            {validListings.length === 0 && (
              <div className="text-center py-20 px-6">
                <svg className="mx-auto mb-4 text-zinc-700" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
                <p className="text-sm font-medium text-zinc-400">
                  No hay equipos con ubicación
                </p>
                <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                  Los equipos aparecerán aquí cuando tengan una dirección asignada.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: Mapa (mapcn Dark Matter) ── */}
        <div className="flex-1 h-[60vh] md:h-full relative z-0">
          <Map
            theme="dark"
            center={defaultCenter}
            zoom={12}
            className="w-full h-full"
          >
            {/* Geolocalización automática al entrar */}
            <FlyToUser />

            <MapControls
              position="bottom-right"
              showZoom
              showLocate
              showFullscreen
            />

            {validListings.map((listing) => {
              const isActive = activeId === listing.id || selectedId === listing.id;

              return (
                <MapMarker
                  key={listing.id}
                  longitude={listing.address.longitude}
                  latitude={listing.address.latitude}
                  onClick={() => handleMarkerClick(listing.id)}
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
