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
      className="min-h-screen bg-white pb-20"
    >
      {/* ── Page header ── */}
      <header
        className="pt-8 sm:pt-14 pb-6 sm:pb-10 px-4 sm:px-6 max-w-[1200px] mx-auto"
      >
        {/* Eyebrow label */}
        <p
          className="category-badge"
          style={{ marginBottom: "16px", display: "inline-flex" }}
        >
          ✦ Marketplace
        </p>

        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2.5"
        >
          Catálogo de Equipos
        </h1>

        <p
          className="text-base text-gray-500 max-w-[540px] leading-relaxed"
        >
          Equipos profesionales de audio, iluminación y producción — alquilados
          directamente de propietarios verificados cerca de ti.
        </p>

        {/* Subtle divider */}
        <div
          className="mt-8 h-px"
          style={{
            background:
              "linear-gradient(90deg, #875B9A 0%, transparent 70%)",
          }}
        />
      </header>

      {/* ── Catalog grid ── */}
      <section
        aria-label="Available equipment listings"
        className="max-w-[1200px] mx-auto px-4 sm:px-6"
      >
        {listings.length === 0 ? (
          /* ── Empty state ── */
          <div
            className="flex flex-col items-center justify-center text-center bg-gray-50 border border-gray-200 rounded-2xl"
            style={{ padding: "72px 32px", gap: "16px" }}

            role="status"
            aria-live="polite"
          >
            <span style={{ fontSize: "3rem" }} aria-hidden="true">
              📭
            </span>
            <h2
              className="text-lg font-semibold text-gray-900"
            >
              Aún no hay equipos disponibles
            </h2>
            <p
              className="text-sm text-gray-500 max-w-[340px]"
            >
              ¡Sé el primero! Los proveedores pueden publicar equipos desde
              su panel de control.
            </p>
          </div>
        ) : (
          /* ── Responsive grid: 1 → 2 → 3 columns ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Listing count footer */}
        {listings.length > 0 && (
          <p
            className="text-xs text-center text-gray-400 mt-10"
          >
            Mostrando{" "}
            <strong className="text-gray-600">
              {listings.length}
            </strong>{" "}
            {listings.length === 1 ? "equipo publicado" : "equipos publicados"}
          </p>
        )}
      </section>
    </main>
  );
}
