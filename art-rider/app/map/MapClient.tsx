"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./leaflet-overrides.css";
import L from "leaflet";
import Navbar from "@/components/layout/Navbar";
import Image from "next/image";
import styles from "./map.module.css";

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

function createPriceIcon(price: number, isActive: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles["marker-pill"]}${isActive ? ` ${styles["marker-pill--hovered"]}` : ""}">${formatPrice(price)}</div>`,
    iconSize: [60, 28],
    iconAnchor: [30, 14],
  });
}

// ── Geolocation hook ───────────────────────────────────────────────────────────

function FlyToUser({ fallback }: { fallback: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, {
          duration: 1.5,
        });
      },
      () => {
        // Permission denied or error → stay at fallback
        map.setView(fallback, 12);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [map, fallback]);

  return null;
}

// ── Preview Card (no usamos Popup nativo de Leaflet) ───────────────────────────

function PreviewCard({ listing }: { listing: MapListing }) {
  return (
    <div className={styles["preview-card"]}>
      {listing.cover_image_url ? (
        <img
          src={listing.cover_image_url}
          alt={listing.title}
          className={styles["preview-card__img"]}
        />
      ) : (
        <div className={styles["preview-card__img-placeholder"]}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
      )}
      <div className={styles["preview-card__body"]}>
        <p className={styles["preview-card__category"]}>
          {CATEGORY_LABELS[listing.category] ?? listing.category}
        </p>
        <h3 className={styles["preview-card__title"]}>{listing.title}</h3>
        <div className={styles["preview-card__footer"]}>
          <span className={styles["preview-card__price"]}>
            {formatPrice(listing.daily_price)}
            <span className={styles["preview-card__price-unit"]}> / día</span>
          </span>
          <span className={styles["preview-card__city"]}>
            {listing.address.city}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Listing Card (panel izquierdo) ─────────────────────────────────────────────

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
      className={`w-full flex gap-4 rounded-xl text-left cursor-pointer transition-all duration-200 group p-2 ${
        isActive
          ? "bg-gray-50 ring-1 ring-gray-200"
          : "hover:bg-gray-50"
      }`}
    >
      <div className="w-28 h-20 bg-gray-100 rounded-lg overflow-hidden relative shrink-0">
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 justify-center min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
          {CATEGORY_LABELS[listing.category] ?? listing.category}
        </span>
        <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">
          {listing.title}
        </h3>
        <p className="text-xs text-gray-400 truncate">{listing.address.city}</p>
        <p className="text-sm font-bold text-gray-900 mt-1">
          {formatPrice(listing.daily_price)}
          <span className="text-xs font-normal text-gray-400"> / día</span>
        </p>
      </div>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MapClient({ initialListings }: { initialListings: MapListing[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fix Leaflet default icon bug in Next.js
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  const validListings = useMemo(() => {
    return initialListings.filter(
      (l) => l.address && l.address.latitude != null && l.address.longitude != null
    );
  }, [initialListings]);

  const selectedListing = useMemo(
    () => validListings.find((l) => l.id === selectedId) ?? null,
    [validListings, selectedId]
  );

  const defaultCenter: [number, number] = [-0.180653, -78.467838];

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  // Scroll listing into view when selected from map
  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`listing-${selectedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row relative">

        {/* ── Panel izquierdo: Lista ── */}
        <div className="w-full md:w-[380px] lg:w-[440px] bg-white h-[45vh] md:h-full overflow-y-auto border-r border-gray-100 z-10 flex flex-col">
          <div className="p-5 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Cerca de ti
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {validListings.length}{" "}
              {validListings.length === 1 ? "equipo encontrado" : "equipos encontrados"}
            </p>
          </div>

          <div className="p-4 flex flex-col gap-1">
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
              <div className="text-center py-16">
                <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
                <p className="text-sm font-medium text-gray-500">
                  No hay equipos con ubicación registrada
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Los equipos aparecerán aquí cuando tengan una dirección asignada.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: Mapa ── */}
        <div className="flex-1 h-[55vh] md:h-full bg-gray-100 relative z-0">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full"
            zoomControl={false}
          >
            <FlyToUser fallback={defaultCenter} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {validListings.map((listing) => {
              const isActive = activeId === listing.id || selectedId === listing.id;

              return (
                <Marker
                  key={listing.id}
                  position={[listing.address.latitude, listing.address.longitude]}
                  icon={createPriceIcon(listing.daily_price, isActive)}
                  eventHandlers={{
                    mouseover: () => setActiveId(listing.id),
                    mouseout: () => setActiveId(null),
                    click: () => handleMarkerClick(listing.id),
                  }}
                />
              );
            })}
          </MapContainer>

          {/* Floating preview card */}
          {selectedListing && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] w-[280px]"
              style={{ animation: "previewFadeIn 0.2s ease" }}
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                {selectedListing.cover_image_url ? (
                  <div className="relative h-36">
                    <Image
                      src={selectedListing.cover_image_url}
                      alt={selectedListing.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                )}
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                    {CATEGORY_LABELS[selectedListing.category] ?? selectedListing.category}
                  </p>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mb-2">
                    {selectedListing.title}
                  </h3>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-extrabold text-gray-900">
                      {formatPrice(selectedListing.daily_price)}
                      <span className="text-xs font-normal text-gray-400"> / día</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {selectedListing.address.city}
                    </span>
                  </div>
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={() => setSelectedId(null)}
                className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
