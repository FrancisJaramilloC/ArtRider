"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, MapPin } from "lucide-react";
import { useFavorito } from "@/hooks/useFavorito";
import type { FavoritoTipo } from "@/services/favoritosService";

const CAT_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", advertising: "Publicidad", other: "Otro",
};

const CAT_GRADIENTS: Record<string, string> = {
  audio:       "from-[#875B9A] to-[#5c3569]",
  lighting:    "from-blue-600 to-blue-900",
  video:       "from-violet-600 to-violet-900",
  effects:     "from-pink-600 to-pink-900",
  advertising: "from-indigo-600 to-indigo-900",
  other:       "from-gray-500 to-gray-800",
};

export interface LandingCardItem {
  id: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  daily_price: number;   // cents
  city: string;
  isTop?: boolean;
  href: string;
  /** "equipo" por defecto — pasar "paquete" para tarjetas de paquetes */
  tipo?: FavoritoTipo;
  rating?: number;
}

export default function LandingCard({ item }: { item: LandingCardItem }) {
  const { esFavorito, toggleFavorito } = useFavorito(item.id, item.tipo ?? "equipo");

  const catLabel  = CAT_LABELS[item.category ?? ""] ?? item.category ?? "Equipo";
  const gradient  = CAT_GRADIENTS[item.category ?? ""] ?? CAT_GRADIENTS.other;
  const price     = `$${(item.daily_price / 100).toFixed(0)}`;

  return (
    <Link
      href={item.href}
      className="block flex-shrink-0 min-w-[262px] scroll-snap-align-start group"
      style={{ flex: "0 0 calc((100% - 66px) / 4)" }}
    >
      {/* Photo */}
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient}`} style={{ aspectRatio: "20 / 15" }}>
        {item.cover_image_url ? (
          <Image
            src={item.cover_image_url}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <span className="text-white text-4xl">📦</span>
          </div>
        )}

        {/* Heart */}
        <button
          onClick={toggleFavorito}
          aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
          className="absolute right-2.5 top-2.5 w-[34px] h-[34px] flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={esFavorito ? "stroke-[#C026D3]" : "stroke-white"}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill={esFavorito ? "#C026D3" : "rgba(0,0,0,0.3)"} />
          </svg>
        </button>

        {/* Top badge */}
        {item.isTop && (
          <span className="absolute left-3 top-3 bg-white/95 backdrop-blur-sm text-[11px] font-extrabold text-gray-900 px-2.5 py-1.5 rounded-full shadow-sm">
            Top
          </span>
        )}
      </div>

      {/* Body */}
      <div className="pt-3 px-0.5">
        <p className="text-[11px] font-bold tracking-[.06em] uppercase text-gray-400 mb-1">
          {catLabel}
        </p>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14.5px] font-bold text-gray-900 leading-snug line-clamp-2 flex-1">
            {item.title}
          </h3>
          <span className="flex items-center gap-1 text-[13px] font-semibold flex-shrink-0 mt-0.5 text-gray-900">
            <Star size={12} strokeWidth={0} className="fill-gray-900" />
            {item.rating && item.rating > 0 ? item.rating.toFixed(1) : "Nuevo"}
          </span>
        </div>
        <p className="flex items-center gap-1 mt-1 text-[12.5px] text-gray-400 font-medium">
          <MapPin size={13} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="truncate">{item.city}</span>
        </p>
        <p className="mt-2 text-[13.5px] text-gray-500">
          <strong className="text-[15.5px] font-extrabold text-gray-900">{price}</strong>
          {" "}<span className="font-normal">por día</span>
        </p>
      </div>
    </Link>
  );
}
