import { getListingById } from "@/services/listingsService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import MapWrapper from "@/components/listing-map/MapWrapper";
import NoImagePlaceholder from "@/components/listing-map/NoImagePlaceholder";
import { BookingCard } from "@/components/features/bookings/BookingCard";

export const revalidate = 0;

// Tipos

type Review = {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  reviewer_id: string;
};

// Label maps

const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", other: "Otro",
};
const CATEGORY_ICONS: Record<string, string> = {
  audio: "🔊", lighting: "💡", video: "🎥", effects: "✨", other: "📦",
};

// Funciones para el tiempo

function timeAgo(dateString: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 86_400_000
  );
  if (days < 1) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 14) return "Hace 1 semana";
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} mes${months > 1 ? "es" : ""}`;
  const years = Math.floor(days / 365);
  return `Hace ${years} año${years > 1 ? "s" : ""}`;
}

function memberSince(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
  });
}

// Sub-components

// Estrellas
function StarRow({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={star <= filled ? "#111827" : "none"}
          stroke={star <= filled ? "#111827" : "#D1D5DB"}
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// Sin imagen placeholder
function NoImagePlaceholder({ icon }: { icon: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-300">
      <span className="text-5xl opacity-30" aria-hidden="true">{icon}</span>
      <span className="text-xs font-medium">Sin imagen</span>
    </div>
  );
}

// Metadatos de la pagina
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  return {
    title: listing
      ? `${listing.title} | ArtRider`
      : "Equipo no encontrado | ArtRider",
    description:
      listing?.description ??
      "Consulta los detalles de este equipo para alquiler en ArtRider.",
  };
}

// Componente principal de la pagina
export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const supabase = await createSupabaseServerClient();

  //  Datos del proveedor
  let providerName: string | null = null;
  let providerSince: string | null = null;
  try {
    const { data } = await supabase
      .from("providers")
      .select("brand_name, created_at")
      .eq("id", listing.provider_id)
      .maybeSingle();
    if (data) {
      providerName = data.brand_name ?? null;
      providerSince = data.created_at ? memberSince(data.created_at) : null;
    }
  } catch { /* fail silently */ }

  //  Datos de las reseñas
  let reviews: Review[] = [];
  try {
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, content, created_at, reviewer_id")
      .eq("listing_id", listing.id)
      .order("created_at", { ascending: false });
    reviews = (data ?? []) as Review[];
  } catch { /* table may not exist yet */ }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  //  Datos de los listados cercanos
  // Se usa un cliente admin para evitar problemas de RLS
  // Los datos se obtienen de la tabla "listings"
  let nearbyListings: any[] = [];
  try {
    const adminSupabase = createSupabaseAdminClient();
    const { data } = await adminSupabase
      .from("listings")
      .select(`
        *,
        address:addresses(latitude, longitude, city, state)
      `)
      .eq("is_published", true)
      .not("address_id", "is", null)
      .limit(20);
    nearbyListings = data ?? [];
  } catch { /* ignore error */ }

  //  Valores de visualización
  const priceDisplay = `$${(listing.daily_price / 100).toFixed(2)}`;
  const catLabel =
    CATEGORY_LABELS[listing.category ?? ""] ?? listing.category ?? "Equipo";
  const catIcon = CATEGORY_ICONS[listing.category ?? ""] ?? "📦";
  const providerInitial = (providerName ?? "P").charAt(0).toUpperCase();
  const hasImage = !!listing.cover_image_url;

  return (
    <main className="min-h-screen bg-white">
      {/*  Navegación de retorno  */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver al catálogo
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">

        {/*  BLOQUE DE TÍTULO  */}
        <div className="mb-5">
          <span className="category-badge">{catIcon} {catLabel}</span>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3 leading-tight">
            {listing.title ?? "Equipo sin título"}
          </h1>

          {(listing.brand || listing.model) && (
            <p className="text-sm text-gray-500 mt-1">
              {[listing.brand, listing.model].filter(Boolean).join(" · ")}
            </p>
          )}

          {/*  Resumen del rating (solo cuando existen reseñas)  */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-sm text-gray-700">
              <svg
                width="13" height="13" viewBox="0 0 24 24"
                fill="#111827" aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-gray-400 mx-0.5">·</span>
              <a
                href="#reviews"
                className="underline underline-offset-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
              </a>
            </div>
          )}
        </div>

        {/*  Galería  */}

        {/*  Versión Móvil  */}
        <div className="block md:hidden mb-6">
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-100">
            {hasImage ? (
              <Image
                src={listing.cover_image_url!}
                alt={listing.title ?? "Equipo"}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <NoImagePlaceholder icon={catIcon} />
            )}
          </div>
        </div>

        {/*  Versión de Escritorio  */}
        <div className="hidden md:grid grid-cols-[3fr_2fr] gap-2 rounded-2xl overflow-hidden h-[420px] mb-10">
          {/*  Imagen principal  */}
          <div className="relative bg-gray-100">
            {hasImage ? (
              <Image
                src={listing.cover_image_url!}
                alt={listing.title ?? "Equipo"}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1200px) 60vw, 720px"
              />
            ) : (
              <NoImagePlaceholder icon={catIcon} />
            )}
          </div>

          {/*  MiniGalería de Imágenes  */}
          <div className="grid grid-rows-2 gap-2">
            <div className="bg-gray-100" aria-hidden="true" />
            <div className="bg-gray-100" aria-hidden="true" />
          </div>
        </div>

        {/*  GRID PRINCIPAL: Columna izquierda (información) y columna derecha (reserva)  */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 lg:gap-14 items-start">

          {/*  COLUMNA IZQUIERDA  */}
          <div className="min-w-0">

            {/*  Bloque del proveedor  */}
            {providerName && (
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                <div
                  className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 text-base font-bold select-none"
                  aria-label={`Proveedor: ${providerName}`}
                >
                  {providerInitial}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{providerName}</p>
                  {providerSince && (
                    <p className="text-sm text-gray-500">Proveedor desde {providerSince}</p>
                  )}
                </div>
              </div>
            )}

            {/*  Descripción  */}
            {listing.description && (
              <div className="py-6 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  Sobre este equipo
                </h2>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            {/*  Reseñas  */}
            <div
              id="reviews"
              className="pt-6 scroll-mt-20"
            >
              {/*  Encabezado de la sección  */}
              <div className="flex items-center gap-2 mb-6">
                {reviews.length > 0 ? (
                  <>
                    <svg
                      width="18" height="18" viewBox="0 0 24 24"
                      fill="#111827" aria-hidden="true"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <h2 className="text-lg font-bold text-gray-900">
                      {avgRating.toFixed(1)} · {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
                    </h2>
                  </>
                ) : (
                  <h2 className="text-lg font-bold text-gray-900">Reseñas</h2>
                )}
              </div>

              {/*  Estado vacío  */}
              {reviews.length === 0 ? (
                <p className="text-gray-500 font-medium">No hay reseñas aún</p>
              ) : (
                /*  Grid de reseñas  */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2 pt-6 border-t border-gray-200">
                  {reviews.map((review) => (
                    <div key={review.id} className="flex flex-col gap-2.5">
                      {/*  Encabezado del reseñador  */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-gray-500 select-none">
                            C
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Cliente verificado
                          </p>
                          <p className="text-xs text-gray-400">
                            {timeAgo(review.created_at)}
                          </p>
                        </div>
                      </div>
                      {/*  Estrellas  */}
                      <StarRow rating={review.rating} />
                      {/*  Texto de la reseña  */}
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {review.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mapa de ubicación  */}
            {listing.address_id && (
              <div className="py-8 border-t border-gray-100 mt-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Ubicación</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Ubicación aproximada del equipo
                  </p>
                </div>
                <div className="h-[400px] md:h-[500px] w-full rounded-2xl overflow-hidden border border-gray-200">
                  <MapWrapper
                    currentListing={listing as any}
                    nearbyListings={[]}
                  />
                </div>
              </div>
            )}
          </div>

          {/*  Columna derecha  */}
          <div className="hidden lg:block">
            <BookingCard listingId={listing.id} dailyPrice={listing.daily_price} />
          </div>
        </div>

        {/*  Precio y reserva en móvil  */}
        <div className="block lg:hidden mt-10 pt-6 border-t border-gray-100">
          <BookingCard listingId={listing.id} dailyPrice={listing.daily_price} />
        </div>

      </div>
    </main>
  );
}
