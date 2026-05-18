"use client";

import Link from "next/link";
import Image from "next/image";
import { Music2, Zap, Video, Sparkles, Package, Megaphone } from "lucide-react";
import type { Listing } from "@/services/listingsService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  audio:       "Sonido",
  lighting:    "Iluminación",
  video:       "Video",
  effects:     "Efectos",
  advertising: "Publicidad",
  other:       "Otro",
};

// ── Placeholder ligero — nada dramático ──────────────────────────────────────

const PLACEHOLDERS: Record<string, { Icon: React.ElementType; bg: string; iconColor: string }> = {
  audio:       { Icon: Music2,    bg: "bg-gray-100", iconColor: "text-gray-300" },
  lighting:    { Icon: Zap,       bg: "bg-gray-100", iconColor: "text-gray-300" },
  video:       { Icon: Video,     bg: "bg-gray-100", iconColor: "text-gray-300" },
  effects:     { Icon: Sparkles,  bg: "bg-gray-100", iconColor: "text-gray-300" },
  advertising: { Icon: Megaphone, bg: "bg-gray-100", iconColor: "text-gray-300" },
  other:       { Icon: Package,   bg: "bg-gray-100", iconColor: "text-gray-300" },
};

function ImagePlaceholder({ category }: { category: string | null }) {
  const key = (category ?? "other").toLowerCase();
  const { Icon, bg, iconColor } = PLACEHOLDERS[key] ?? PLACEHOLDERS.other;
  return (
    <div className={`w-full h-full ${bg} flex items-center justify-center`}>
      <Icon size={28} strokeWidth={1.25} className={iconColor} />
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

export default function ExploreCard({ listing }: { listing: Listing }) {
  const title = listing.title ?? "Equipo sin título";

  const addr = Array.isArray((listing as any).address)
    ? (listing as any).address[0]
    : (listing as any).address;

  // Línea 2: ciudad si existe, si no brand·model, si no categoría
  const line2: string =
    addr?.city ??
    (listing.brand && listing.model
      ? `${listing.brand} · ${listing.model}`
      : listing.brand ?? listing.model ?? (CATEGORY_LABELS[listing.category ?? ""] ?? ""));

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A] focus-visible:ring-offset-2 rounded-2xl"
      aria-label={`Ver equipo: ${title}`}
    >
      {/* ── Imagen cuadrada, esquinas redondeadas como Airbnb ── */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 mb-2.5">
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 1280px) 27vw, 320px"
          />
        ) : (
          <ImagePlaceholder category={listing.category} />
        )}

        {/* Micro-badge solo cuando no hay imagen */}
        {!listing.cover_image_url && (
          <span className="absolute top-2 left-2 px-2 py-[3px] rounded-full text-[10px] font-medium tracking-wide uppercase bg-white/80 text-gray-500 border border-gray-200">
            {CATEGORY_LABELS[listing.category ?? ""] ?? listing.category}
          </span>
        )}
      </div>

      {/* ── 3 líneas de texto exactas — estilo Airbnb ── */}
      <div className="space-y-[2px]">

        {/* Línea 1: Nombre — semibold, truncado */}
        <h3 className="text-[13px] font-semibold text-gray-900 leading-snug truncate">
          {title}
        </h3>

        {/* Línea 2: Ciudad / Brand — gris suave */}
        <p className="text-[12px] text-gray-500 leading-snug truncate">
          {line2}
        </p>

        {/* Línea 3: Precio — número bold + unidad gris */}
        <p className="text-[13px] text-gray-900 leading-snug">
          <span className="font-semibold">{formatPrice(listing.daily_price)}</span>
          <span className="font-normal text-gray-500"> / día</span>
        </p>

      </div>
    </Link>
  );
}
