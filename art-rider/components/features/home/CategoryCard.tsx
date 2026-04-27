"use client";

/**
 * CategoryCard.tsx — Server Component (no interaction, pure display)
 * Full-bleed image card with dark overlay, bottom-left icon + title + "Explorar" text.
 * Matches the screenshot: Sonido, Iluminación, Video, Efectos cards.
 */

import Image from "next/image";
import Link from "next/link";

export interface CategoryCardProps {
  /** Category name displayed in bold at the bottom */
  title: string;
  /** Path to the background image (relative to /public) */
  imageSrc: string;
  /** Small emoji or icon shown above the title */
  icon: string;
  /** URL the card links to */
  href: string;
}

export default function CategoryCard({
  title,
  imageSrc,
  icon,
  href,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="relative block rounded-2xl overflow-hidden cursor-pointer no-underline aspect-[3/4] border border-slate-100 group transition-all duration-200 hover:-translate-y-1 hover:shadow-sm"
      aria-label={`Explorar categoría: ${title}`}
    >
      {/* Background image */}
      <Image
        src={imageSrc}
        alt={title}
        fill
        style={{ objectFit: "cover" }}
        sizes="(max-width: 768px) 50vw, 25vw"
      />

      {/* Dark gradient overlay — stronger at bottom */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      {/* Bottom-left content */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {/* Icon chip */}
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "6px",
            backgroundColor: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "15px",
            marginBottom: "6px",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
          aria-hidden="true"
        >
          {icon}
        </div>

        {/* Category title */}
        <span
          style={{
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "1.15rem",
            lineHeight: 1.2,
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          {title}
        </span>

        {/* Explorar label */}
        <span
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
        >
          Explorar
        </span>
      </div>
    </Link>
  );
}
