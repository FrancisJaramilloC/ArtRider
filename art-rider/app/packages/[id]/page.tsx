import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPackageById } from "@/services/packagesService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import PackageMapWrapper from "@/components/listing-map/PackageMapWrapper";

type Review = {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  reviewer_id: string;
};

export const revalidate = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", other: "Otro",
};
const CATEGORY_ICONS: Record<string, string> = {
  audio: "🔊", lighting: "💡", video: "🎥", effects: "✨", other: "📦",
};

function memberSince(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-EC", { year: "numeric", month: "long" });
}

function timeAgo(dateString: string): string {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000);
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

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getPackageById(id);
  return {
    title: pkg ? `${pkg.title} | ArtRider` : "Paquete no encontrado | ArtRider",
    description: pkg?.description ?? "Consulta los detalles de este paquete en ArtRider.",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NoImagePlaceholder({ emoji = "📦" }: { emoji?: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-300">
      <span className="text-5xl opacity-30">{emoji}</span>
      <span className="text-xs font-medium">Sin imagen</span>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getPackageById(id);
  if (!pkg) notFound();

  // Sesión del usuario + datos adicionales
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Reseñas del paquete
  let reviews: Review[] = [];
  try {
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, content, created_at, reviewer_id")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false });
    reviews = (data ?? []) as Review[];
  } catch { /* tabla puede no existir aún */ }

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const priceDisplay = fmtPrice(pkg.daily_price);
  const itemCount = pkg.items?.length ?? 0;
  const sumCents = (pkg.items ?? []).reduce(
    (sum, it) => sum + (it.listing?.daily_price ?? 0),
    0
  );
  const hasDiscount = sumCents > 0 && pkg.daily_price < sumCents;
  const discountPct = hasDiscount ? Math.round((1 - pkg.daily_price / sumCents) * 100) : 0;

  // Construir listados para el mapa — solo los ítems con coordenadas válidas
  const mapListings = (pkg.items ?? [])
    .filter(
      (it) =>
        it.listing?.address?.latitude != null &&
        it.listing?.address?.longitude != null
    )
    .map((it) => ({
      id: it.listing!.id,
      title: it.listing!.title ?? "Equipo",
      category: it.listing!.category ?? "other",
      daily_price: it.listing!.daily_price,
      cover_image_url: it.listing!.cover_image_url,
      address: it.listing!.address as {
        latitude: number;
        longitude: number;
        city: string;
        state: string;
      },
    }));
  const hasMapListings = mapListings.length > 0;

  return (
    <main className="min-h-screen bg-white">

      {/* ── Back link ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver al catálogo
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">

        {/* ── Header ── */}
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#875B9A] bg-[#875B9A]/8 px-3 py-1.5 rounded-full">
            📦 Paquete completo
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3 leading-tight">
            {pkg.title}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-sm text-gray-500">
              {itemCount} equipo{itemCount !== 1 ? "s" : ""} incluido{itemCount !== 1 ? "s" : ""}
            </p>
            {reviews.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-700">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#111827" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-gray-400 mx-0.5">·</span>
                <a href="#reviews" className="underline underline-offset-2 hover:text-gray-900 transition-colors">
                  {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── Galería móvil ── */}
        <div className="block md:hidden mb-6">
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-100">
            {pkg.cover_image_url ? (
              <Image
                src={pkg.cover_image_url}
                alt={pkg.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            ) : (
              <NoImagePlaceholder />
            )}
          </div>
        </div>

        {/* ── Galería desktop ── */}
        <div className="hidden md:grid grid-cols-[3fr_2fr] gap-2 rounded-2xl overflow-hidden h-[420px] mb-10">
          <div className="relative bg-gray-100">
            {pkg.cover_image_url ? (
              <Image
                src={pkg.cover_image_url}
                alt={pkg.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1200px) 60vw, 720px"
              />
            ) : (
              <NoImagePlaceholder />
            )}
          </div>
          {/* Panel secundario con galería */}
          <div className="grid grid-rows-2 gap-2">
            {[0, 1].map((idx) => {
              const galleryUrl = pkg.gallery_images?.[idx] ?? null;
              return (
                <div
                  key={idx}
                  className={`relative bg-gray-100 overflow-hidden${idx === 0 ? " rounded-tr-2xl" : " rounded-br-2xl"}`}
                >
                  {galleryUrl ? (
                    <Image
                      src={galleryUrl}
                      alt={`${pkg.title} — foto ${idx + 2}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1200px) 40vw, 480px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Grid principal ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 lg:gap-14 items-start">

          {/* ── Columna izquierda ── */}
          <div className="min-w-0 space-y-8">

            {/* Proveedor */}
            {pkg.provider && (
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 text-base font-bold select-none">
                  {(pkg.provider.brand_name ?? "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{pkg.provider.brand_name}</p>
                  <p className="text-sm text-gray-500">
                    Proveedor desde {memberSince(pkg.provider.created_at)}
                  </p>
                </div>
              </div>
            )}

            {/* Descripción */}
            {pkg.description && (
              <div className="border-b border-gray-100 pb-8">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  Sobre este paquete
                </h2>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {pkg.description}
                </p>
              </div>
            )}

            {/* ── Equipos incluidos ── */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Equipos incluidos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(pkg.items ?? []).map((item) => {
                  const l = item.listing;
                  if (!l) return null;
                  const catLabel = CATEGORY_LABELS[l.category ?? ""] ?? l.category ?? "Equipo";
                  const catIcon  = CATEGORY_ICONS[l.category ?? ""] ?? "📦";
                  return (
                    <Link
                      key={item.id}
                      href={`/listings/${l.id}`}
                      className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-[#875B9A]/30 hover:bg-[#875B9A]/4 transition-all"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {l.cover_image_url ? (
                          <Image
                            src={l.cover_image_url}
                            alt={l.title ?? "Equipo"}
                            fill
                            sizes="64px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">
                            {catIcon}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                          {catLabel}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 truncate leading-snug group-hover:text-[#875B9A] transition-colors">
                          {l.title ?? "Equipo sin título"}
                        </p>
                        {(l.brand || l.model) && (
                          <p className="text-xs text-gray-400 truncate">
                            {[l.brand, l.model].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <p className="text-sm font-black text-gray-900 mt-1">
                          {fmtPrice(l.daily_price)}
                          <span className="text-xs font-normal text-gray-400 ml-1">/ día</span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Suma de precios */}
              {sumCents > 0 && (
                <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <p className="text-sm text-gray-500">Precio total si rents por separado</p>
                  <p className="text-sm font-bold text-gray-400 line-through">
                    {fmtPrice(sumCents)} / día
                  </p>
                </div>
              )}
            </div>

            {/* ── Mapa de ubicación ── */}
            {hasMapListings && (
              <div className="border-t border-gray-100 pt-8">
                <h2 className="text-base font-semibold text-gray-900 mb-1.5">
                  Ubicación
                </h2>
                <p className="text-sm text-gray-500 mb-5">
                  Ubicación aproximada de los equipos incluidos en este paquete
                </p>
                <div className="h-[380px] w-full rounded-2xl overflow-hidden border border-gray-200">
                  <PackageMapWrapper listings={mapListings} />
                </div>
              </div>
            )}

            {/* ── Reseñas ── */}
            <div id="reviews" className="border-t border-gray-100 pt-8 scroll-mt-20">
              <div className="flex items-center gap-2 mb-6">
                {reviews.length > 0 ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#111827" aria-hidden="true">
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

              {reviews.length === 0 ? (
                <p className="text-gray-500 font-medium">No hay reseñas aún</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2 pt-6 border-t border-gray-200">
                  {reviews.map((review) => (
                    <div key={review.id} className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0 select-none">
                          {review.reviewer_id.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Cliente</p>
                          <p className="text-xs text-gray-400">{timeAgo(review.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} width="13" height="13" viewBox="0 0 24 24"
                            fill={star <= Math.round(review.rating) ? "#111827" : "none"}
                            stroke={star <= Math.round(review.rating) ? "#111827" : "#D1D5DB"}
                            strokeWidth="1.5" aria-hidden="true">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      {review.content && (
                        <p className="text-sm text-gray-700 leading-relaxed">{review.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Columna derecha: CTA de reserva ── */}
          <div className="hidden lg:block">
            <PackageBookingCTA
              packageId={pkg.id}
              price={pkg.daily_price}
              hasDiscount={hasDiscount}
              discountPct={discountPct}
              isLoggedIn={!!user}
            />
          </div>
        </div>

        {/* ── CTA móvil ── */}
        <div className="block lg:hidden mt-10 pt-6 border-t border-gray-100">
          <PackageBookingCTA
            packageId={pkg.id}
            price={pkg.daily_price}
            hasDiscount={hasDiscount}
            discountPct={discountPct}
            isLoggedIn={!!user}
          />
        </div>
      </div>
    </main>
  );
}

// ─── PackageBookingCTA ─────────────────────────────────────────────────────────
// Card lateral con precio y botón principal. Sin lógica de calendario por ahora
// (los paquetes no tienen availabilityService aún — se planea en siguiente sprint).

function PackageBookingCTA({
  packageId,
  price,
  hasDiscount,
  discountPct,
  isLoggedIn,
}: {
  packageId: string;
  price: number;
  hasDiscount: boolean;
  discountPct: number;
  isLoggedIn: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6 space-y-5">
      {/* Precio */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-black text-gray-900">
          {fmtPrice(price)}
        </span>
        <span className="text-sm text-gray-500">por día</span>
        {hasDiscount && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            -{discountPct}% vs. individual
          </span>
        )}
      </div>

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* CTA */}
      {isLoggedIn ? (
        <Link
          href={`/explore?package=${packageId}`}
          className="w-full flex items-center justify-center gap-2 bg-[#875B9A] hover:bg-[#6a437a] text-white font-semibold text-sm py-3.5 px-6 rounded-xl transition-colors shadow-sm"
        >
          Rentar paquete
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      ) : (
        <Link
          href={`/login?next=/packages/${packageId}`}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold text-sm py-3.5 px-6 rounded-xl transition-colors shadow-sm"
        >
          Inicia sesión para rentar
        </Link>
      )}

      {/* Info */}
      <ul className="space-y-2.5 text-xs text-gray-500">
        <li className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Todos los equipos incluidos
        </li>
        <li className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Pago seguro vía Stripe
        </li>
        <li className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Proveedor verificado
        </li>
      </ul>
    </div>
  );
}
