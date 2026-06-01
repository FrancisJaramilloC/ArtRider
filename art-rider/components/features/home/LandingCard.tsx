"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, MapPin, Volume2, Zap, Video, Sparkles, Megaphone, Package } from "lucide-react";

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
  rating?: number;
}

export default function LandingCard({ item }: { item: LandingCardItem }) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("artrider:favs") || "[]");
      setFav(favs.includes(item.id));
    } catch {}
  }, [item.id]);

  const toggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(prev => {
      const next = !prev;
      try {
        const favs: string[] = JSON.parse(localStorage.getItem("artrider:favs") || "[]");
        const updated = next ? [...favs, item.id] : favs.filter(id => id !== item.id);
        localStorage.setItem("artrider:favs", JSON.stringify(updated));
      } catch {}
      return next;
    });
  };

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
          onClick={toggleFav}
          aria-label="Guardar"
          className="absolute right-2.5 top-2.5 w-[34px] h-[34px] flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          <Heart
            size={22}
            strokeWidth={2}
            className={fav ? "fill-[#875B9A] text-[#875B9A]" : "fill-black/30 text-white"}
          />
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
            —
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
