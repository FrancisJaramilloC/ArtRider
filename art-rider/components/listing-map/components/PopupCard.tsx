import Image from "next/image";
import type { MapListing } from "../types";
import { CATEGORY_LABELS, formatPrice } from "../constants";

/** Tarjeta de popup al hacer clic en un marcador del mapa */
export function PopupCard({ listing }: { listing: MapListing }) {
  return ( 
    /* Con imagen */
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
        /* Sin imagen */
        <div className="h-28 -mx-3 -mt-3 mb-3 bg-zinc-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
      )}
      {/* Categoria */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
        {CATEGORY_LABELS[listing.category] ?? listing.category}
      </p>
      {/* Titulo */}
      <h3 className="text-sm font-semibold text-zinc-100 leading-tight line-clamp-2 mb-2">
        {listing.title}
      </h3>
      {/* Precio */}
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
