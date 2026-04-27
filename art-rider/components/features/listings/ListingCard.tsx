"use client";

/**
 * ListingCard.tsx — Client Component
 *
 * Renders a single listing in the public catalog grid.
 * Receives a `Listing` object as a prop, forwarded from the Server Component
 * parent (app/listings/page.tsx).
 *
 * Interactivity: hover lift animation (CSS), navigation to detail page (Link).
 */

import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/services/listingsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats an integer price (stored in cents) to a display string. */
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Returns a gradient and emoji for a category to make the placeholder image vivid. */
function getCategoryStyle(category: string | null): {
  gradient: string;
  icon: string;
} {
  const map: Record<string, { gradient: string; icon: string }> = {
    audio:    { gradient: "linear-gradient(135deg, #1a0533 0%, #4b1d6e 100%)", icon: "🎧" },
    lighting: { gradient: "linear-gradient(135deg, #0a1a33 0%, #1d3d6e 100%)", icon: "💡" },
    video:    { gradient: "linear-gradient(135deg, #1a0303 0%, #6e1d1d 100%)", icon: "🎥" },
    effects:  { gradient: "linear-gradient(135deg, #03031a 0%, #1d1d6e 100%)", icon: "✨" },
    other:    { gradient: "linear-gradient(135deg, #f3f0f7 0%, #e8e0f0 100%)", icon: "📦" },
  };
  const key = (category ?? "").toLowerCase();
  return map[key] ?? { gradient: "linear-gradient(135deg, #f3f0f7 0%, #e8e0f0 100%)", icon: "📦" };
}

const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", other: "Otro",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const category = listing.category;
  const { gradient, icon } = getCategoryStyle(category);

  const title = listing.title ?? "Equipo sin título";
  const subtitle =
    listing.brand && listing.model
      ? `${listing.brand} · ${listing.model}`
      : listing.brand ?? listing.model ?? null;

  const categoryLabel = CATEGORY_LABELS[category ?? ""] ?? category;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="listing-card block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A] focus-visible:ring-offset-2"
      aria-label={`Ver equipo: ${title}`}
    >
      {/* ── Image area ── */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: "176px",
          borderRadius: "16px 16px 0 0",
          overflow: "hidden",
        }}
      >
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 300px"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: gradient }}
          >
            <span
              style={{
                fontSize: "3.5rem",
                filter: "drop-shadow(0 4px 12px rgba(135,91,154,0.45))",
                userSelect: "none",
              }}
              aria-hidden="true"
            >
              {icon}
            </span>
          </div>
        )}

        {/* Category badge */}
        {categoryLabel && (
          <span
            className="category-badge absolute"
            style={{ top: "12px", left: "12px" }}
          >
            {categoryLabel}
          </span>
        )}
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: "16px 20px 20px" }}>
        {/* Title */}
        <h2
          className="text-sm font-semibold leading-snug"
          style={{
            color: "#111827",
            marginBottom: "4px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h2>

        {/* Brand · Model */}
        {subtitle && (
          <p
            className="text-xs"
            style={{ color: "#6b7280", marginBottom: "12px" }}
          >
            {subtitle}
          </p>
        )}

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "rgba(229, 231, 235, 0.6)",
            marginBottom: "12px",
          }}
        />

        {/* Price row */}
        <div className="flex items-end justify-end gap-2">
          <div className="text-right flex-shrink-0">
            <span
              className="text-base font-bold"
              style={{ color: "#875B9A" }}
            >
              {formatPrice(listing.daily_price)}
            </span>
            <span
              className="text-xs block"
              style={{ color: "#9ca3af", marginTop: "-2px" }}
            >
              / día
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
