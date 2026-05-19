"use client";

/**
 * ListingCard.tsx — Componente del lado del cliente
 *
 * Renderiza un único listado en la cuadrícula del catálogo público.
 * Recibe un objeto `Listing` como prop, reenviado desde el componente del lado del servidor
 * padre (app/listings/page.tsx).
 *
 * Interactividad: animación de elevación al pasar el cursor (CSS), navegación a la página de detalles (Link).
 */

import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/services/listingsService";

// Helpers

/** Convierte el precio de centavos a formato de moneda para mostrarlo en la tarjeta */
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Devuelve un gradiente y un emoji para una categoría para hacer que la imagen de marcador de posición sea vívida */
function getCategoryStyle(category: string | null): {
  gradient: string;
  icon: string;
} {
  // Mapa de categorías con gradientes y emojis para hacer que la imagen de marcador de posición sea vívida
  const map: Record<string, { gradient: string; icon: string }> = {
    audio:    { gradient: "linear-gradient(135deg, #1a0533 0%, #4b1d6e 100%)", icon: "🎧" },
    lighting: { gradient: "linear-gradient(135deg, #0a1a33 0%, #1d3d6e 100%)", icon: "💡" },
    video:    { gradient: "linear-gradient(135deg, #1a0303 0%, #6e1d1d 100%)", icon: "🎥" },
    effects:  { gradient: "linear-gradient(135deg, #03031a 0%, #1d1d6e 100%)", icon: "✨" },
    other:    { gradient: "linear-gradient(135deg, #f3f0f7 0%, #e8e0f0 100%)", icon: "📦" },
  };
  const key = (category ?? "").toLowerCase();
  return map[key] ?? { gradient: "linear-gradient(135deg, #f3f0f7 0%, #e8e0f0 100%)", icon: "📦" };
}

// Etiquetas de categorías
const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", other: "Otro",
};

// Interfaz de propiedades del componente de tarjeta de listado
interface ListingCardProps {
  listing: Listing;
}

// Renderizado de la tarjeta de listado
export default function ListingCard({ listing }: ListingCardProps) {
  const category = listing.category;
  const { gradient, icon } = getCategoryStyle(category);

  // Título y subtítulo de la tarjeta
  const title = listing.title ?? "Equipo sin título";
  const subtitle =
    listing.brand && listing.model
      ? `${listing.brand} · ${listing.model}`
      : listing.brand ?? listing.model ?? null;
  const categoryLabel = CATEGORY_LABELS[category ?? ""] ?? category;

  // Renderizado de la tarjeta de listado
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="listing-card block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A] focus-visible:ring-offset-2"
      aria-label={`Ver equipo: ${title}`}
    >
      {/*  Área de la imagen */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 300px"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: gradient }}
          >
            <span
              style={{
                fontSize: "3.5rem",
                filter: "drop-shadow(0 4px 12px rgba(135,91,154,0.45))",
                userSelect: "none",
              }}
              aria-hidden="true"
            >
              {icon}
            </span>
          </div>
        )}

        {/* Renderizado de la categoría*/}
        {categoryLabel && (
          <span
            className="category-badge absolute"
            style={{ top: "12px", left: "12px" }}
          >
            {categoryLabel}
          </span>
        )}
      </div>

      {/* Cuerpo de la tarjeta */}
      <div className="p-4">
        {/* Título */}
        <h2 className="text-sm font-semibold leading-snug text-gray-900 mb-1 line-clamp-2">
          {title}
        </h2>

        {/* Marca · Modelo */}
        {subtitle && (
          <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
        )}

        {/* Línea divisora */}
        <div className="h-px bg-gray-100 mb-3" />

        {/* Precio */}
        <div className="flex items-end justify-end gap-2">
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-bold text-[#875B9A]">
              {formatPrice(listing.daily_price)}
            </span>
            <span className="text-xs text-gray-400 block -mt-0.5">/ día</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
