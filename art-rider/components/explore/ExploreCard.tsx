"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Star, MapPin } from "lucide-react";
import type { Listing } from "@/services/listingsService";

const CAT_LABELS: Record<string, string> = {
  audio:       "Sonido",
  lighting:    "Iluminación",
  video:       "Video",
  effects:     "Efectos",
  advertising: "Publicidad",
  other:       "Otro",
};

const CAT_GRADIENTS: Record<string, string> = {
  audio:       "from-[#875B9A] to-[#5c3569]",
  lighting:    "from-blue-600 to-blue-900",
  video:       "from-violet-600 to-violet-900",
  effects:     "from-pink-600 to-pink-900",
  advertising: "from-indigo-600 to-indigo-900",
  other:       "from-gray-500 to-gray-800",
};

interface ExploreCardProps {
  listing: Listing;
  isFav?: boolean;
  isHovered?: boolean;
  isSelected?: boolean;
  onFav?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  onSelect?: () => void;
}

export default function ExploreCard({
  listing, isFav, isHovered, isSelected,
  onFav, onHover, onLeave, onSelect,
}: ExploreCardProps) {
  const addr     = Array.isArray(listing.address) ? listing.address[0] : listing.address;
  const city     = addr?.city?.trim() || "Ecuador";
  const catLabel = CAT_LABELS[listing.category ?? ""] ?? listing.category ?? "Equipo";
  const gradient = CAT_GRADIENTS[listing.category ?? ""] ?? CAT_GRADIENTS.other;
  const price    = `$${(listing.daily_price / 100).toFixed(0)}`;

  return (
    <article
      className={`cursor-pointer group ${isSelected ? "ring-2 ring-[#875B9A] ring-offset-2 rounded-2xl" : ""}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onSelect}
    >
      {/* Photo */}
      <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-gradient-to-br ${gradient}`}>
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.title ?? "Equipo"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <span className="text-5xl text-white">📦</span>
          </div>
        )}

        {/* Heart */}
        <button
          onClick={e => { e.stopPropagation(); onFav?.(); }}
          aria-label="Guardar"
          className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          <Heart
            size={22}
            strokeWidth={2}
            className={isFav ? "fill-[#875B9A] text-[#875B9A]" : "fill-black/30 text-white"}
          />
        </button>
      </div>

      {/* Body */}
      <Link
        href={`/listings/${listing.id}`}
        onClick={e => e.stopPropagation()}
        className="block outline-none"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Category label */}
            <p className="text-[10.5px] font-bold tracking-[.06em] uppercase text-gray-400 mb-1">
              {catLabel}
            </p>

            {/* Title + rating */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[14.5px] font-bold text-gray-900 leading-snug line-clamp-2 flex-1">
                {listing.title ?? "Equipo sin título"}
              </h3>
              <span className="flex items-center gap-1 text-[13px] font-semibold flex-shrink-0 mt-0.5">
                <Star size={12} strokeWidth={0} className="fill-gray-900" />
                —
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 mt-1 text-[12.5px] text-gray-400 font-medium">
              <MapPin size={12} strokeWidth={1.8} className="flex-shrink-0" />
              <span className="truncate">{city}</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <p className="mt-2.5 text-[13.5px] text-gray-500">
          <strong className="text-[15.5px] font-extrabold text-gray-900">{price}</strong>
          {" "}<span className="font-normal">por día</span>
        </p>
      </Link>
    </article>
  );
}
