"use client";

import Link from "next/link";
import Image from "next/image";

//  Mapeo de categorías
const CATEGORY_LABELS: Record<string, string> = {
  audio: "SONIDO", lighting: "ILUMINACIÓN", video: "VIDEO",
  effects: "EFECTOS", advertising: "PUBLICIDAD", other: "OTRO",
};

//  Renderizado de la tarjeta de listado
export default function ExploreCard({ listing }: { listing: any }) {
  const addr = Array.isArray(listing.address) ? listing.address[0] : listing.address;
  const city = addr?.city?.trim() || "Sin ubicación";
  const price = (listing.daily_price / 100).toFixed(0);
  const catLabel = CATEGORY_LABELS[listing.category ?? ""] ?? listing.category ?? "EQUIPO";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A] rounded-2xl"
    >
      {/* Imagen del equipo */}
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-100 mb-2.5 border border-gray-100">
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.title ?? "Equipo"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-40 bg-gray-200">
            📦
          </div>
        )}

        {/* Etiqueta de categoría */}
        <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[10px] font-bold tracking-wider text-gray-700 px-2 py-1 rounded-md shadow-sm">
          {catLabel}
        </span>
      </div>

      {/* Información del equipo */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[13px] font-semibold text-gray-900 truncate leading-snug">
          {listing.title ?? "Equipo sin título"}
        </h3>
        <p className="text-[12px] text-gray-500 truncate">{city}</p>
        <p className="text-[13px] font-bold text-gray-900 mt-1">
          ${price} <span className="text-[11px] font-normal text-gray-400">por día</span>
        </p>
      </div>
    </Link>
  );
}
