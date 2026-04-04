/**
 * app/listings/page.tsx — Server Component (no "use client")
 *
 * Public catalog view. Renders the full grid of published listings.
 *
 * Rendering model:
 *   - This is a React Server Component: it runs only on the server.
 *   - It calls getListings() directly (no fetch(), no useEffect()).
 *   - It renders <ListingCard> Client Components, passing plain serializable
 *     objects as props. Next.js serializes those props across the Server/Client
 *     boundary automatically.
 *   - No auth gate — this route is 100% public.
 */

import type { Metadata } from "next";
import { getListings } from "@/services/listingsService";
import ListingCard from "@/components/features/listings/ListingCard";

// ─── SEO ──────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Equipment Catalog | ArtRider",
  description:
    "Browse professional audio, lighting, and instrument rental listings on ArtRider — the peer-to-peer marketplace for creative equipment.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ListingsPage() {
  // Direct async call — Server Components can be async functions.
  const listings = await getListings();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        paddingBottom: "80px",
      }}
    >
      {/* ── Page header ── */}
      <header
        style={{
          padding: "56px 24px 40px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Eyebrow label */}
        <p
          className="category-badge"
          style={{ marginBottom: "16px", display: "inline-flex" }}
        >
          ✦ Marketplace
        </p>

        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)", marginBottom: "10px" }}
        >
          Equipment Catalog
        </h1>

        <p
          className="text-base"
          style={{
            color: "var(--text-secondary)",
            maxWidth: "540px",
            lineHeight: "1.65",
          }}
        >
          Professional audio, lighting, and production gear — rented directly
          from verified owners near you.
        </p>

        {/* Subtle divider */}
        <div
          style={{
            marginTop: "32px",
            height: "1px",
            background:
              "linear-gradient(90deg, var(--primary-500) 0%, transparent 70%)",
          }}
        />
      </header>

      {/* ── Catalog grid ── */}
      <section
        aria-label="Available equipment listings"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        {listings.length === 0 ? (
          /* ── Empty state ── */
          <div
            className="listing-card flex flex-col items-center justify-center text-center"
            style={{ padding: "72px 32px", gap: "16px" }}
            role="status"
            aria-live="polite"
          >
            <span style={{ fontSize: "3rem" }} aria-hidden="true">
              📭
            </span>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              No listings available yet
            </h2>
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)", maxWidth: "340px" }}
            >
              Be the first! Owner accounts can publish equipment listings from
              the dashboard.
            </p>
          </div>
        ) : (
          /* ── Responsive grid: 1 → 2 → 3 columns ── */
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
              gap: "24px",
            }}
          >
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Listing count footer */}
        {listings.length > 0 && (
          <p
            className="text-xs text-center"
            style={{
              color: "var(--text-muted)",
              marginTop: "40px",
            }}
          >
            Showing{" "}
            <strong style={{ color: "var(--text-secondary)" }}>
              {listings.length}
            </strong>{" "}
            published{" "}
            {listings.length === 1 ? "listing" : "listings"}
          </p>
        )}
      </section>
    </main>
  );
}
