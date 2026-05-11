import Image from "next/image";
import type { MapListing } from "../types";
import { CATEGORY_LABELS, formatPrice } from "../constants";

type ListingRowProps = {
  listing: MapListing;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
};

/** Fila de un listing en el panel lateral izquierdo del mapa */
export function ListingRow({ listing, isActive, onHover, onLeave, onClick }: ListingRowProps) {
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
