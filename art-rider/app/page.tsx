import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/features/home/HeroSection";
import CategoryCard from "@/components/features/home/CategoryCard";
import HomepageListingCard from "@/components/features/home/HomepageListingCard";
import { HowItWorks } from "@/components/features/home/HowItWorks";
import { BecomeProviderCTA } from "@/components/features/home/BecomeProviderCTA";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getListings } from "@/services/listingsService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ArtRider — Alquila Equipos Creativos para tu Evento",
  description:
    "Marketplace de alquiler de equipos de audio, iluminación y video. Conecta con propietarios verificados y reserva con confianza.",
};

// ── Category maps ──────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  audio: "🔊", lighting: "💡", video: "🎥", effects: "✨", other: "📦",
};

const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video", effects: "Efectos", other: "Otro",
};

// ─── Shared section header ─────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  centered = false,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className={`flex ${centered ? "flex-col items-center text-center" : "flex-row flex-wrap items-center justify-between"} mb-5 sm:mb-8 gap-3 sm:gap-4`}>
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          className="text-[#875B9A] hover:text-[#6a437a] hover:bg-purple-50 px-4 py-2 rounded-lg text-[0.95rem] font-semibold transition-colors shrink-0"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  // ── Provider check (server-side) — determines CTA visibility ──────────────
  let isProvider = false;
  if (authData?.user) {
    const { data: providerRow } = await supabase
      .from("providers")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    isProvider = !!providerRow;
  }

  // ── Fetch real published listings ──────────────────────────────────────────
  let realListings: {
    id: string;
    title: string | null;
    category: string | null;
    daily_price: number;
    cover_image_url: string | null;
  }[] = [];
  try {
    realListings = await getListings();
  } catch {
    // silently fail — section hidden if empty
  }

  // ── Fetch real published packages (all providers, public view) ─────────────
  let realPackages: { id: string; title: string; daily_price: number }[] = [];
  try {
    const { data } = await supabase
      .from("packages")
      .select("id, title, daily_price")
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    realPackages = (data ?? []) as { id: string; title: string; daily_price: number }[];
  } catch {
    // silently fail — section hidden if empty
  }

  // ── Map to card format (cap at 8 items per section) ───────────────────────
  const featuredEquipment = realListings.slice(0, 8).map((l) => ({
    id: l.id,
    title: l.title ?? "Equipo sin título",
    categoryLabel: CATEGORY_LABELS[l.category ?? ""] ?? l.category ?? "Equipo",
    location: "Ecuador",
    price: `$${(l.daily_price / 100).toFixed(0)}`,
    rating: 0,
    reviewCount: 0,
    icon: CATEGORY_ICONS[l.category ?? ""] ?? "📦",
  }));

  const featuredPackages = realPackages.slice(0, 8).map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    categoryLabel: "Paquete Completo",
    location: "Ecuador",
    price: `$${(pkg.daily_price / 100).toFixed(0)}`,
    rating: 0,
    reviewCount: 0,
    icon: "📦",
  }));

  // ── Static categories ──────────────────────────────────────────────────────
  const CATEGORIES = [
    { title: "Sonido",      imageSrc: "/category-sonido.png",      href: "/listings?category=audio" },
    { title: "Iluminación", imageSrc: "/category-iluminacion.png", href: "/listings?category=lighting" },
    { title: "Publicidad",  imageSrc: "/category-publicidad.png",  href: "/listings?category=advertising" },
    { title: "Video",       imageSrc: "/category-video.png",       href: "/listings?category=video" },
    { title: "Efectos",     imageSrc: "/category-efectos.png",     href: "/listings?category=effects" },
  ];

  return (
    <>
      <Navbar initialUser={authData?.user || null} />
      <main>
        <HeroSection />

        {/* ── Explora por categoría ── */}
        <section id="categorias" className="bg-white py-8 sm:py-12 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="Explora por categoría"
              subtitle="Encuentra exactamente lo que necesitas para tu evento"
            />
            <div className="-mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 pb-4 overflow-x-auto flex gap-4 md:gap-5 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {CATEGORIES.map((cat) => (
                <CategoryCard key={cat.title} {...cat} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Equipos destacados — hidden if no real listings exist ── */}
        {featuredEquipment.length > 0 && (
          <section id="equipos" className="bg-white py-8 sm:py-12 scroll-mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
              <SectionHeader
                title="Equipos destacados"
                ctaLabel={`Mostrar (${realListings.length})`}
                ctaHref="/listings"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
                {featuredEquipment.map((item) => (
                  <HomepageListingCard key={item.id} {...item} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Paquetes destacados — always visible ── */}
        <section id="paquetes" className="bg-white py-8 sm:py-12 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
            <SectionHeader
              title="Paquetes destacados elaborados por expertos"
              subtitle="Combos listos para rentar que ahorran dinero y tiempo"
              ctaLabel={realPackages.length > 0 ? `Mostrar (${realPackages.length})` : undefined}
              ctaHref="/listings?type=packages"
            />
            {featuredPackages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
                {featuredPackages.map((item) => (
                  <HomepageListingCard key={item.id} {...item} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 py-12 px-6 text-center">
                <span className="text-3xl" aria-hidden="true">📦</span>
                <p className="text-sm font-medium text-gray-500">
                  Aún no hay paquetes disponibles.
                </p>
                <p className="text-xs text-gray-400">
                  Los proveedores pueden crear paquetes desde su panel de control.
                </p>
              </div>
            )}
          </div>
        </section>

        <HowItWorks />

        {/* ── Become a provider CTA — hidden from existing providers ── */}
        {!isProvider && <BecomeProviderCTA />}

      </main>

      <Footer />
    </>
  );
}
