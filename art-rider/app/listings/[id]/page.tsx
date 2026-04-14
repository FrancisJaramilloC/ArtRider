import { getListingById } from "@/services/listingsService";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

const CATEGORY_LABELS: Record<string, string> = {
  audio: "🔊 Sonido", lighting: "💡 Iluminación",
  video: "🎥 Video", effects: "✨ Efectos", other: "📦 Otro",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  return {
    title: listing ? `${listing.title} | ArtRider` : "Equipo no encontrado | ArtRider",
    description: listing?.description ?? "Consulta los detalles de este equipo para alquiler en ArtRider.",
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) notFound();

  const priceDisplay = `$${(listing.daily_price / 100).toFixed(2)}`;
  const categoryLabel = CATEGORY_LABELS[listing.category ?? ""] ?? listing.category;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-2">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Volver al catálogo
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">

          {/* ── Left: Cover image ── */}
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-gray-100 shadow-sm">
            {listing.cover_image_url ? (
              <Image
                src={listing.cover_image_url}
                alt={listing.title ?? "Equipo"}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-300">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-sm">Sin imagen</span>
              </div>
            )}
          </div>

          {/* ── Right: Details ── */}
          <div className="flex flex-col gap-6">
            {/* Category badge */}
            <div>
              <span className="inline-block text-xs font-semibold text-[#875B9A] bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
                {categoryLabel}
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                {listing.title ?? "Equipo sin título"}
              </h1>
              {(listing.brand || listing.model) && (
                <p className="text-base text-gray-500 mt-1">
                  {[listing.brand, listing.model].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-[#875B9A]">{priceDisplay}</span>
              <span className="text-gray-400 text-sm font-medium">/ día</span>
            </div>

            {/* Divider */}
            <hr className="border-gray-100" />

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            {/* CTA — Booking placeholder */}
            <div className="mt-auto">
              <button
                disabled
                title="Las reservas estarán disponibles próximamente"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-200 text-gray-500 py-4 text-base font-semibold cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Reservar — Próximamente
              </button>
              <p className="text-xs text-center text-gray-400 mt-2">
                Las reservas en línea estarán disponibles muy pronto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
