import { getListingById } from "@/services/listingsService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getUnavailableDates } from "@/services/availabilityService";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import MapWrapper from "@/components/listing-map/MapWrapper";
import { BookingCard } from "@/components/features/bookings/BookingCard";
import Navbar from "@/components/layout/Navbar";
import ListingGallery from "./ListingGallery";
import ListingActions from "./ListingActions";
import {
  Star, MapPin, ShieldCheck, ArrowLeft, ChevronRight,
  Share2, Truck, Headphones, Zap,
  Volume2, Lightbulb, Video, Sparkles, Megaphone, Package,
} from "lucide-react";

export const revalidate = 0;

// ── Types ──────────────────────────────────────────────────────────────────────
type Review = {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  reviewer_id: string;
};

// ── Maps ───────────────────────────────────────────────────────────────────────
const CAT_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", advertising: "Publicidad", other: "Otro",
};

const CAT_ICONS: Record<string, React.ElementType> = {
  audio: Volume2, lighting: Lightbulb, video: Video,
  effects: Sparkles, advertising: Megaphone, other: Package,
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days < 1) return "Hoy";
  if (days < 7) return `Hace ${days} día${days > 1 ? "s" : ""}`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? "s" : ""}`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `Hace ${mo} mes${mo > 1 ? "es" : ""}`;
  return `Hace ${Math.floor(days / 365)} año${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

function memberSince(d: string) {
  return new Date(d).toLocaleDateString("es-EC", { year: "numeric", month: "long" });
}

function avgRatingOf(reviews: Review[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

// ── Metadata ───────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  return {
    title: listing ? `${listing.title} | ArtRider` : "Equipo no encontrado | ArtRider",
    description: listing?.description ?? "Consulta los detalles de este equipo de alquiler.",
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const [supabase, unavailableDates] = await Promise.all([
    createSupabaseServerClient(),
    getUnavailableDates(listing.id),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  // Provider
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
  } catch { /* silent */ }

  // Reviews
  let reviews: Review[] = [];
  try {
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, content, created_at, reviewer_id")
      .eq("listing_id", listing.id)
      .order("created_at", { ascending: false })
      .limit(6);
    reviews = (data ?? []) as Review[];
  } catch { /* silent */ }

  // Nearby listings for map
  let nearbyListings: any[] = [];
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("listings")
      .select("*, address:addresses(latitude, longitude, city, state)")
      .eq("is_published", true)
      .not("address_id", "is", null)
      .limit(20);
    nearbyListings = data ?? [];
  } catch { /* silent */ }

  // Derived values
  const price = listing.daily_price / 100;
  const catLabel = CAT_LABELS[listing.category ?? ""] ?? listing.category ?? "Equipo";
  const CatIcon = CAT_ICONS[listing.category ?? ""] ?? Package;
  const providerInitial = (providerName ?? "P").charAt(0).toUpperCase();
  const avgRating = avgRatingOf(reviews);
  const addr = Array.isArray(listing.address) ? listing.address[0] : listing.address;
  const city = addr?.city ?? null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar initialUser={user} />

      <main className="max-w-[1200px] mx-auto px-8 pt-6 pb-24">

        {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-2 text-[13px] text-gray-400 font-medium mb-5">
          <Link href="/explore" className="flex items-center gap-1.5 text-gray-600 font-semibold hover:text-[#875B9A] transition-colors">
            <ArrowLeft size={15} strokeWidth={2} />
            Equipos
          </Link>
          <ChevronRight size={13} className="text-gray-300" />
          <span>{catLabel}</span>
          <ChevronRight size={13} className="text-gray-300" />
          <span className="text-gray-900 font-semibold truncate max-w-[320px]">{listing.title}</span>
        </nav>

        {/* ── Title bar ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-6 mb-5">
          <div className="min-w-0 flex-1">
            {/* Category badge */}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-[.07em] uppercase text-[#6a437a] bg-[#875B9A]/[.08] px-3 py-1.5 rounded-full">
              <CatIcon size={13} strokeWidth={2} className="text-[#875B9A]" />
              {catLabel}
            </span>

            <h1 className="text-[30px] font-extrabold tracking-[-0.022em] text-gray-900 mt-3 mb-2.5 leading-[1.15] max-w-[760px]">
              {listing.title ?? "Equipo sin título"}
            </h1>

            {/* Sub-line */}
            <div className="flex items-center flex-wrap gap-2 text-[13.5px] text-gray-600 font-medium">
              {reviews.length > 0 && (
                <>
                  <span className="flex items-center gap-1 font-bold text-gray-900">
                    <Star size={14} strokeWidth={0} className="fill-gray-900" />
                    {avgRating.toFixed(2)}
                  </span>
                  <span className="text-gray-200">·</span>
                  <a href="#resenas" className="font-bold text-gray-900 underline underline-offset-2 hover:text-[#875B9A] transition-colors">
                    {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
                  </a>
                  <span className="text-gray-200">·</span>
                </>
              )}
              <span className="inline-flex items-center gap-1.5 font-bold text-[#6a437a]">
                <ShieldCheck size={14} className="text-[#875B9A]" />
                Proveedor verificado
              </span>
              {city && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <MapPin size={13} strokeWidth={1.8} />
                    {city}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 flex-shrink-0 mt-1">
            <button className="flex items-center gap-1.5 text-[13.5px] font-bold text-gray-700 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <Share2 size={16} /> Compartir
            </button>
            <ListingActions listingId={listing.id} />
          </div>
        </div>

        {/* ── Gallery ─────────────────────────────────────────────────────────── */}
        <ListingGallery
          mainImage={listing.cover_image_url}
          galleryImages={listing.gallery_images ?? null}
          title={listing.title ?? "Equipo"}
          totalPhotos={(listing.gallery_images?.length ?? 0) + (listing.cover_image_url ? 1 : 0)}
        />

        {/* ── Two-column layout ────────────────────────────────────────────────── */}
        <div className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1fr) 392px", gap: "64px" }}>

          {/* ── LEFT COLUMN ────────────────────────────────────────────────────── */}
          <div className="min-w-0">

            {/* Provider */}
            <section className="flex items-center justify-between gap-5 pb-8 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold flex-shrink-0 select-none">
                  {providerInitial}
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-gray-900 tracking-[-0.01em]">
                    Equipo ofrecido por {providerName ?? "Proveedor ArtRider"}
                  </h2>
                  <p className="text-[13.5px] text-gray-400 mt-0.5">
                    {providerSince ? `Proveedor desde ${providerSince}` : "Proveedor verificado"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6a437a] bg-[#875B9A]/[.08] px-3.5 py-2 rounded-full flex-shrink-0">
                <ShieldCheck size={15} className="text-[#875B9A]" />
                Verificado
              </span>
            </section>

            {/* Highlights */}
            <section className="py-8 border-b border-gray-100 grid grid-cols-3 gap-5">
              {[
                { Icon: Truck,       title: "Entrega e instalación",    sub: "Incluida en el alquiler" },
                { Icon: Headphones,  title: "Operador certificado",      sub: "Soporte durante el evento" },
                { Icon: Zap,         title: "Reserva inmediata",          sub: "Confirmación al instante" },
              ].map(({ Icon, title, sub }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-[13px] bg-[#875B9A]/[.08] flex items-center justify-center flex-shrink-0">
                    <Icon size={20} strokeWidth={1.7} className="text-[#6a437a]" />
                  </span>
                  <div>
                    <strong className="block text-[13.5px] font-bold text-gray-900 leading-snug">{title}</strong>
                    <em className="block text-[12.5px] text-gray-400 not-italic mt-0.5">{sub}</em>
                  </div>
                </div>
              ))}
            </section>

            {/* About */}
            {listing.description && (
              <section className="py-8 border-b border-gray-100">
                <h2 className="text-[21px] font-extrabold tracking-[-0.015em] text-gray-900 mb-3">
                  Sobre este equipo
                </h2>
                <p className="text-[15px] leading-[1.65] text-gray-600 max-w-[660px]">
                  {listing.description}
                </p>
                {(listing.brand || listing.model) && (
                  <div className="mt-6 grid grid-cols-2 gap-2.5 max-w-[520px]">
                    {listing.brand && (
                      <div className="flex justify-between gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-[13px] text-gray-400 font-semibold">Marca</span>
                        <span className="text-[13.5px] font-bold text-gray-900">{listing.brand}</span>
                      </div>
                    )}
                    {listing.model && (
                      <div className="flex justify-between gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-[13px] text-gray-400 font-semibold">Modelo</span>
                        <span className="text-[13.5px] font-bold text-gray-900">{listing.model}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Reviews */}
            <section id="resenas" className="py-8 border-b border-gray-100 scroll-mt-24">
              <div className="flex items-center gap-2 mb-5">
                <Star size={20} strokeWidth={0} className="fill-gray-900" />
                <h2 className="text-[21px] font-extrabold tracking-[-0.015em] text-gray-900">
                  {reviews.length > 0
                    ? `${avgRating.toFixed(2)} · ${reviews.length} reseña${reviews.length !== 1 ? "s" : ""}`
                    : "Reseñas"}
                </h2>
              </div>

              {reviews.length === 0 ? (
                <p className="text-[14px] text-gray-400 font-medium">
                  Sé el primero en reseñar este equipo.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-10 gap-y-7">
                  {reviews.map((rv) => {
                    const initials = "C";
                    const colors = ["#7c3aed", "#db2f8e", "#2563eb", "#0891b2", "#059669", "#d97706"];
                    const color = colors[rv.id.charCodeAt(0) % colors.length];
                    return (
                      <article key={rv.id} className="flex flex-col">
                        <div className="flex items-center gap-3 mb-2.5">
                          <span
                            className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0 select-none"
                            style={{ background: color }}
                          >
                            {initials}
                          </span>
                          <div>
                            <strong className="block text-[14.5px] font-bold text-gray-900">Cliente verificado</strong>
                            <em className="block text-[12.5px] text-gray-400 not-italic">{timeAgo(rv.created_at)}</em>
                          </div>
                        </div>
                        {/* Stars */}
                        <div className="flex items-center gap-0.5 mb-2">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} strokeWidth={0}
                              className={s <= Math.round(rv.rating) ? "fill-[#875B9A]" : "fill-gray-200"} />
                          ))}
                        </div>
                        <p className="text-[14px] leading-[1.6] text-gray-600">{rv.content}</p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Map */}
            {addr?.latitude && addr?.longitude && (
              <section className="pt-8">
                <h2 className="text-[21px] font-extrabold tracking-[-0.015em] text-gray-900 mb-2">
                  Ubicación
                </h2>
                <p className="flex items-center gap-1.5 text-[13.5px] text-gray-400 font-medium mb-4">
                  <MapPin size={14} strokeWidth={1.8} />
                  {city ?? "Ecuador"} · Ubicación aproximada
                </p>
                <div className="h-[420px] rounded-[18px] overflow-hidden border border-gray-100">
                  <MapWrapper
                    currentListing={listing as any}
                    nearbyListings={nearbyListings as any}
                  />
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT COLUMN: Booking card ───────────────────────────────────── */}
          <aside className="sticky top-24">
            {/* Price header */}
            <div className="border border-gray-200 rounded-[18px] p-6 shadow-[0_12px_34px_-10px_rgba(22,19,28,.16),0_2px_6px_rgba(22,19,28,.04)]">
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[26px] font-extrabold text-gray-900 tracking-[-0.02em]">
                  ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
                </span>
                <span className="text-[15px] text-gray-400 font-medium">/ día</span>
                {reviews.length > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-[13px] font-bold text-gray-900">
                    <Star size={13} strokeWidth={0} className="fill-gray-900" />
                    {avgRating.toFixed(2)}
                    <span className="text-gray-400 font-normal underline ml-0.5">
                      {reviews.length} reseñas
                    </span>
                  </span>
                )}
              </div>

              <BookingCard
                listingId={listing.id}
                dailyPrice={listing.daily_price}
                initialDisabledDates={unavailableDates}
              />
            </div>

            {/* Trust badge */}
            <div className="flex items-start gap-2.5 mt-4 px-1 text-[12.5px] text-gray-400 font-medium leading-relaxed">
              <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              Pago protegido con <strong className="text-gray-600 font-bold">SafeRider</strong>. Reembolso garantizado si el equipo no llega.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
