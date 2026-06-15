"use client";

import Link from "next/link";
import Image from "next/image";
import { useFavorito } from "@/hooks/useFavorito";
import type { FavoritoTipo } from "@/services/favoritosService";

export interface HomepageListingCardProps {
  id: string;
  title: string;
  categoryLabel: string;
  location: string;
  price: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  icon: string;
  imageUrl?: string | null;
  /** Sobrescribe el href por defecto (/listings/:id). Útil para paquetes. */
  href?: string;
  /** "equipo" por defecto — pasar "paquete" para tarjetas de paquetes. */
  tipo?: FavoritoTipo;
}

export default function HomepageListingCard({
  id,
  title,
  categoryLabel,
  location,
  price,
  rating,
  reviewCount,
  badge,
  icon,
  imageUrl,
  href,
  tipo = "equipo",
}: HomepageListingCardProps) {
  const { esFavorito, toggleFavorito } = useFavorito(id, tipo);

  return (
    <Link
      href={href ?? `/listings/${id}`}
      className="group flex flex-col h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A] rounded-2xl"
    >
      {/* Área de la imagen */}
      <div className="relative aspect-[3/2] w-full rounded-2xl overflow-hidden bg-gray-100 mb-2.5 shrink-0 border border-slate-100">

        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="320px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-50 bg-gray-200 transition-transform duration-500 group-hover:scale-105">
            {icon}
          </div>
        )}

        {/* Corazón */}
        <button
          onClick={toggleFavorito}
          aria-label={esFavorito ? "Quitar de favoritos" : "Añadir a favoritos"}
          className="absolute top-3 right-3 p-1 rounded-full hover:scale-110 active:scale-95 transition-transform z-10 drop-shadow-md"
        >
          <svg
            width="24" height="24" viewBox="0 0 24 24"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            fill={esFavorito ? "#C026D3" : "rgba(0,0,0,0.4)"}
            stroke={esFavorito ? "#C026D3" : "white"}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {badge && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 text-[0.7rem] font-bold px-2 py-1 rounded shadow-sm tracking-wide">
            {badge}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 flex-1">
        <div className="flex justify-between items-center w-full">
          <span className="text-[0.75rem] font-bold text-gray-500 tracking-wide uppercase">
            {categoryLabel}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-800">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900 translate-y-[-1px]">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="font-medium">{rating > 0 ? rating.toFixed(1) : "Nuevo"}</span>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 truncate tracking-tight leading-snug">
          {title}
        </h3>

        <div className="flex items-center gap-1 mt-0.5 text-gray-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-xs truncate">{location}</span>
        </div>

        <div className="mt-auto pt-1.5 flex items-baseline gap-1">
          <span className="text-sm font-bold text-gray-900">{price}</span>
          <span className="text-xs text-gray-500">por día</span>
        </div>
      </div>
    </Link>
  );
}
