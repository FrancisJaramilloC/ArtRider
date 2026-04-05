import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/features/home/HeroSection";
import CategoryCard from "@/components/features/home/CategoryCard";
import HomepageListingCard from "@/components/features/home/HomepageListingCard";
import { HowItWorks } from "@/components/features/home/HowItWorks";
import { BecomeProviderCTA } from "@/components/features/home/BecomeProviderCTA";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ArtRider — Alquila Equipos Creativos para tu Evento",
  description:
    "Marketplace de alquiler de equipos de audio, iluminación y video. Conecta con propietarios verificados y reserva con confianza.",
};

// ─── Mock Data (Pure UI mode) ──────────────────────────────────────────────────

const CATEGORIES = [
  { title: "Sonido",      imageSrc: "/category-sonido.png",      icon: "🔊", href: "/listings?category=audio" },
  { title: "Iluminación", imageSrc: "/category-iluminacion.png", icon: "💡", href: "/listings?category=lighting" },
  { title: "Video",       imageSrc: "/category-video.png",       icon: "🎥", href: "/listings?category=video" },
  { title: "Efectos",     imageSrc: "/category-efectos.png",     icon: "✨", href: "/listings?category=effects" },
];

// Note: Duplicated items heavily below to demonstrate the horizontal scrolling carousel effectiveness
const FEATURED_EQUIPMENT = [
  {
    id: "mock-sub-beta-1",
    title: "Subwoofer Activo Beta 3",
    categoryLabel: "Sonido",
    location: "Quito, EC",
    price: "$50",
    rating: 4.8,
    reviewCount: 12,
    icon: "🔊",
  },
  {
    id: "mock-beta-es215a-2",
    title: "Parlante Beta 3 ES215A",
    categoryLabel: "Sonido",
    location: "Guayaquil, EC",
    price: "$30",
    rating: 4.9,
    reviewCount: 45,
    icon: "🔉",
  },
  {
    id: "mock-light-3",
    title: "Cabeza Móvil LED 150W",
    categoryLabel: "Iluminación",
    location: "Cuenca, EC",
    price: "$25",
    rating: 4.5,
    reviewCount: 8,
    badge: "OFERTA",
    icon: "💡",
  },
  {
    id: "mock-video-4",
    title: "Sony FX3 + Lentes",
    categoryLabel: "Video",
    location: "Quito, EC",
    price: "$120",
    rating: 5.0,
    reviewCount: 102,
    icon: "🎥",
  },
];

const FEATURED_PACKAGES = [
  {
    id: "mock-intermedio-1",
    title: "Paquete Audiovisual Intermedio",
    categoryLabel: "Paquete Completo",
    location: "Quito, EC",
    price: "$150",
    rating: 4.8,
    reviewCount: 22,
    badge: "OFERTA",
    icon: "📦",
  },
  {
    id: "mock-basico-2",
    title: "Paquete Básico para Fiestas",
    categoryLabel: "Paquete Completo",
    location: "Guayaquil, EC",
    price: "$80",
    rating: 4.7,
    reviewCount: 15,
    icon: "📦",
  },
  {
    id: "mock-pro-3",
    title: "Setup Completo Conciertos Pro",
    categoryLabel: "Paquete Completo",
    location: "Cuenca, EC",
    price: "$450",
    rating: 5.0,
    reviewCount: 3,
    icon: "📦",
  },
];

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
    <div className={`flex ${centered ? "flex-col items-center text-center" : "flex-row flex-wrap items-center justify-between"} mb-8 gap-4`}>
      <div>
        <h2 className="text-[1.75rem] font-bold text-gray-900 tracking-tight leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[1rem] text-gray-500 mt-1">
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

// ─── Horizontal Carousel Container Wrapper ──────────────────────────────────────

function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  return (
    // Uses native CSS mandatory snap scrolling for smooth mobile/desktop PWA feel, hides scrollbars
    <div className="-mx-6 px-6 pb-6 overflow-x-auto flex gap-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return (
    <>
      <Navbar initialUser={data?.user || null} />      <main>
        <HeroSection />

        {/* ── Explora por categoría ── */}
        <section className="bg-white px-6 pt-8 pb-16">
          <div className="max-w-[1240px] mx-auto">
            <SectionHeader
              title="Explora por categoría"
              subtitle="Encuentra exactamente lo que necesitas para tu evento"
            />
            {/* Keeping grid for categories as they are standard cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {CATEGORIES.map((cat) => (
                <CategoryCard key={cat.title} {...cat} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Equipos destacados (Horizontal Scroll) ── */}
        <section className="bg-white px-6 pt-4 pb-16">
          <div className="max-w-[1240px] mx-auto overflow-hidden">
            <SectionHeader
              title="Equipos destacados"
              ctaLabel="Mostrar (150+)"
              ctaHref="/listings"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
              {FEATURED_EQUIPMENT.map((item) => (
                <HomepageListingCard key={item.id} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Paquetes destacados (Horizontal Scroll) ── */}
        <section className="bg-white px-6 pt-4 pb-24">
          <div className="max-w-[1240px] mx-auto overflow-hidden">
            <SectionHeader
              title="Paquetes destacados elaborados por expertos"
              subtitle="Combos listos para rentar que ahorran dinero y tiempo"
              ctaLabel="Mostrar (42+)"
              ctaHref="/listings?type=packages"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
              {FEATURED_PACKAGES.map((item) => (
                <HomepageListingCard key={item.id} {...item} />
              ))}
            </div>
          </div>
        </section>

        <HowItWorks />
        <BecomeProviderCTA />

      </main>

      <Footer />
    </>
  );
}
