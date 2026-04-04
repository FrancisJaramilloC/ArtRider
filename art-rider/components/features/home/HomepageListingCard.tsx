"use client";

import Link from "next/link";

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
}: HomepageListingCardProps) {
  return (
    <Link
      href={`/listings/${id}`}
      className="group flex flex-col h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A] rounded-2xl"
    >
      {/* ── Image Area (Aspect Ratio 1:1 strict) ── */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-100 mb-3 shrink-0 border border-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]">
        
        {/* Placeholder emoji/icon for mock */}
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-50 bg-gray-200 transition-transform duration-500 group-hover:scale-105">
          {icon}
        </div>

        {/* Favorite Heart (Airbnb style floating icon) */}
        <button 
          className="absolute top-3 right-3 p-1 rounded-full hover:scale-110 active:scale-95 transition-transform z-10 text-gray-50 drop-shadow-md"
          aria-label="Añadir a favoritos"
          onClick={(e) => {
            e.preventDefault(); // Prevent navigating to detail page on heart click
            console.log("Heart clicked:", id);
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,0.4)" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white hover:fill-red-500 hover:text-red-500 transition-colors">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        {/* Optional Badge */}
        {badge && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 text-[0.7rem] font-bold px-2 py-1 rounded shadow-sm tracking-wide">
            {badge}
          </span>
        )}
      </div>

      {/* ── Typography / Info Layout ── */}
      <div className="flex flex-col gap-0.5 flex-1">
        
        {/* Category & Rating Row */}
        <div className="flex justify-between items-center w-full">
          <span className="text-[0.75rem] font-bold text-gray-500 tracking-wide uppercase">
            {categoryLabel}
          </span>
          {/* Subtle star rating on the right */}
          <div className="flex items-center gap-1 text-[0.85rem] text-gray-800">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900 translate-y-[-1px]">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="font-medium">{rating > 0 ? rating.toFixed(1) : "Nuevo"}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[1rem] font-semibold text-gray-900 truncate tracking-tight leading-snug">
          {title}
        </h3>

        {/* Location Row (Subtle) */}
        <div className="flex items-center gap-1 mt-0.5 text-gray-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span className="text-[0.88rem] truncate">
            {location}
          </span>
        </div>

        {/* Price Row (Pushed to bottom) */}
        <div className="mt-auto pt-1.5 flex items-baseline gap-1">
          <span className="text-[0.95rem] font-semibold text-gray-900">{price}</span>
          <span className="text-[0.88rem] text-gray-500">por día</span>
        </div>

      </div>
    </Link>
  );
}
