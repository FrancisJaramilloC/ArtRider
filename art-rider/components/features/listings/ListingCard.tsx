"use client";

/**
 * ListingCard.tsx — Client Component
 *
 * Renders a single listing in the public catalog grid.
 * Receives a hydrated `ListingWithRelations` object as a prop, forwarded
 * from the Server Component parent (app/listings/page.tsx).
 *
 * Interactivity: hover lift animation (CSS), navigation to detail page (Link).
 * No auth state is read here — that lives only in ReserveButton.
 */

import Link from "next/link";
import type { ListingWithRelations } from "@/types/listings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats an integer price (stored in smallest currency unit) to a display string. */
function formatPrice(cents: number): string {
  // Prices are stored as integers; treat as full currency units (e.g. COP pesos)
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(cents);
}

/** Returns a gradient and emoji for a category to make the placeholder image vivid. */
function getCategoryStyle(category: string | null): {
  gradient: string;
  icon: string;
} {
  const map: Record<string, { gradient: string; icon: string }> = {
    audio:       { gradient: "linear-gradient(135deg, #1a0533 0%, #4b1d6e 100%)", icon: "🎧" },
    lighting:    { gradient: "linear-gradient(135deg, #0a1a33 0%, #1d3d6e 100%)", icon: "💡" },
    instruments: { gradient: "linear-gradient(135deg, #1a1a03 0%, #5c5c0d 100%)", icon: "🎸" },
    video:       { gradient: "linear-gradient(135deg, #1a0303 0%, #6e1d1d 100%)", icon: "🎥" },
    dj:          { gradient: "linear-gradient(135deg, #03031a 0%, #1d1d6e 100%)", icon: "🎛️" },
  };
  const key = (category ?? "").toLowerCase();
  return map[key] ?? { gradient: "linear-gradient(135deg, #12101a 0%, #2a1f3d 100%)", icon: "📦" };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: ListingWithRelations;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const catalog = listing.product_catalog;
  const address = listing.addresses;
  const category = catalog?.category ?? null;
  const { gradient, icon } = getCategoryStyle(category);

  const title = catalog?.name ?? "Equipment Listing";
  const subtitle =
    catalog?.brand && catalog?.model
      ? `${catalog.brand} · ${catalog.model}`
      : catalog?.brand ?? catalog?.model ?? null;

  const location =
    address
      ? [address.city, address.state].filter(Boolean).join(", ")
      : null;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="listing-card block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`View listing: ${title}`}
    >
      {/* ── Placeholder image area ── */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: "176px",
          background: gradient,
          borderRadius: "16px 16px 0 0",
        }}
      >
        {/* Category badge */}
        {category && (
          <span
            className="category-badge absolute"
            style={{ top: "12px", left: "12px" }}
          >
            {category}
          </span>
        )}

        {/* Equipment icon */}
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

      {/* ── Card body ── */}
      <div style={{ padding: "16px 20px 20px" }}>
        {/* Title */}
        <h2
          className="text-sm font-semibold leading-snug"
          style={{
            color: "var(--text-primary)",
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
            style={{ color: "var(--text-secondary)", marginBottom: "12px" }}
          >
            {subtitle}
          </p>
        )}

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "var(--border-subtle)",
            marginBottom: "12px",
          }}
        />

        {/* Location + Price row */}
        <div className="flex items-end justify-between gap-2">
          {/* Location */}
          <div className="flex items-center gap-1 min-w-0">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span
              className="text-xs truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {location ?? "Location not set"}
            </span>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <span
              className="text-base font-bold"
              style={{ color: "var(--primary-400)" }}
            >
              {formatPrice(listing.daily_price)}
            </span>
            <span
              className="text-xs block"
              style={{ color: "var(--text-muted)", marginTop: "-2px" }}
            >
              / day
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
