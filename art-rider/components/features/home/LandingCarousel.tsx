"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import LandingCard, { type LandingCardItem } from "./LandingCard";

interface LandingCarouselProps {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  items: LandingCardItem[];
}

export default function LandingCarousel({ title, subtitle, viewAllHref, items }: LandingCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 620, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="max-w-[1240px] mx-auto px-8 pt-[30px] pb-2">
      {/* Section header */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <Link
            href={viewAllHref}
            className="group inline-flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.02em] text-gray-900 hover:text-[#6a437a] transition-colors"
          >
            {title}
            <ChevronRight
              size={20}
              strokeWidth={2.2}
              className="text-gray-900 group-hover:text-[#875B9A] group-hover:translate-x-0.5 transition-all"
            />
          </Link>
          {subtitle && (
            <p className="text-[14px] text-gray-400 font-medium mt-1">{subtitle}</p>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => scroll(-1)}
            aria-label="Anterior"
            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-800 hover:border-gray-800 hover:shadow-sm hover:scale-105 transition-all"
          >
            <ChevronLeft size={17} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Siguiente"
            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-800 hover:border-gray-800 hover:shadow-sm hover:scale-105 transition-all"
          >
            <ChevronRight size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Scroll row */}
      <div
        ref={scrollRef}
        className="flex gap-[22px] overflow-x-auto [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [scrollbar-width:none] pb-2"
      >
        {items.map(item => (
          <LandingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
