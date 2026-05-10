"use client";

/**
 * CategoryCard.tsx — Clean, premium category card without emoji icons.
 * Full-bleed image with dark gradient overlay and bottom-left title + "Explorar" label.
 * Smooth hover animation with scale and shadow.
 */

import Image from "next/image";
import Link from "next/link";

export interface CategoryCardProps {
  /** Category name displayed in bold at the bottom */
  title: string;
  /** Path to the background image (relative to /public) */
  imageSrc: string;
  /** URL the card links to */
  href: string;
}

export default function CategoryCard({
  title,
  imageSrc,
  href,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="
        relative block rounded-2xl overflow-hidden cursor-pointer no-underline
        h-[170px] sm:h-[220px] md:h-[270px] min-w-[180px] sm:min-w-[210px] lg:min-w-0 lg:flex-1 shrink-0
        group transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(135,91,154,0.2)]
      "
      aria-label={`Explorar categoría: ${title}`}
    >
      {/* Background image */}
      <Image
        src={imageSrc}
        alt={title}
        fill
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        sizes="(max-width: 1024px) 280px, 20vw"
      />

      {/* Dark gradient overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/25 to-black/75 transition-opacity duration-300 group-hover:to-black/65"
      />

      {/* Bottom-left content */}
      <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 flex flex-col gap-0.5 sm:gap-1">
        {/* Category title */}
        <span className="text-white font-bold text-base sm:text-lg leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
          {title}
        </span>

        {/* Explorar label */}
        <span className="text-white/70 text-sm font-medium tracking-wide group-hover:text-white/90 transition-colors duration-300">
          Explorar
        </span>
      </div>
    </Link>
  );
}
