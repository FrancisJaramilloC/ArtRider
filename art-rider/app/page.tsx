import Navbar from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getListings } from "@/services/listingsService";
import { getAverageRatingForListings } from "@/services/reviewService";
import type { Metadata } from "next";
import LandingHero from "@/components/features/home/LandingHero";
import LandingCategoryStrip from "@/components/features/home/LandingCategoryStrip";
import LandingCarousel from "@/components/features/home/LandingCarousel";
import LandingHowItWorks from "@/components/features/home/LandingHowItWorks";
import LandingFooter from "@/components/features/home/LandingFooter";
import type { LandingCardItem } from "@/components/features/home/LandingCard";

export const metadata: Metadata = {
  title: "ArtRider — Alquila Equipos Creativos para tu Evento",
  description:
    "Marketplace de alquiler de equipos de audio, iluminación y video. Conecta con propietarios verificados y reserva con confianza.",
};

export default async function HomePage() {
  // Auth
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Listings
  let listings: Awaited<ReturnType<typeof getListings>> = [];
  try { listings = await getListings(); } catch {}

  // Packages
  let packages: { id: string; title: string; daily_price: number; cover_image_url: string | null }[] = [];
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("packages")
      .select("id, title, daily_price, cover_image_url")
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    packages = (data ?? []) as typeof packages;
  } catch {}

  // Ratings reales por listing
  let ratingsMap: Record<string, number> = {};
  try {
    const listingIds = listings.map((l) => l.id);
    ratingsMap = await getAverageRatingForListings(listingIds);
  } catch {
    // falla silenciosa — cards muestran "Nuevo"
  }

  // ── Group listings by city (dynamic — new cities auto-appear) ──
  const cityMap = new Map<string, LandingCardItem[]>();
  for (const listing of listings) {
    const addr = Array.isArray(listing.address) ? listing.address[0] : listing.address;
    const city = addr?.city?.trim();
    if (!city) continue;
    if (!cityMap.has(city)) cityMap.set(city, []);
    cityMap.get(city)!.push({
      id: listing.id,
      title: listing.title ?? "Equipo sin título",
      category: listing.category,
      cover_image_url: listing.cover_image_url,
      daily_price: listing.daily_price,
      city,
      rating: ratingsMap[listing.id] ?? 0,
      isTop: false,
      href: `/listings/${listing.id}`,
      tipo: "equipo",
    });
  }

  // Cities sorted by listing count desc, min 1 listing to show
  const cities = Array.from(cityMap.entries())
    .filter(([, items]) => items.length >= 1)
    .sort(([, a], [, b]) => b.length - a.length);

  // City names for the hero dropdown
  const cityNames = cities.map(([city]) => city);

  // ── Packages as LandingCardItem ──
  const packageItems: LandingCardItem[] = packages.slice(0, 8).map(pkg => ({
    id: pkg.id,
    title: pkg.title,
    category: null,
    cover_image_url: pkg.cover_image_url,
    daily_price: pkg.daily_price,
    city: "Ecuador",
    rating: 0,
    isTop: false,
    href: `/packages/${pkg.id}`,
    tipo: "paquete",
  }));

  return (
    <>
      <Navbar initialUser={user} />

      <main>
        {/* Hero */}
        <LandingHero cities={cityNames} />

        {/* Category strip */}
        <LandingCategoryStrip />

        {/* One carousel per city — fully dynamic */}
        <section id="equipos" className="scroll-mt-16">
          {cities.map(([city, items]) => (
            <LandingCarousel
              key={city}
              title={`Equipos populares en ${city}`}
              viewAllHref={`/explore?city=${encodeURIComponent(city)}`}
              items={items}
            />
          ))}
        </section>

        {/* Packages */}
        {packageItems.length > 0 && (
          <section id="paquetes" className="scroll-mt-16">
            <LandingCarousel
              title="Paquetes destacados"
              subtitle="Combos listos para rentar que ahorran dinero y tiempo"
              viewAllHref="/packages"
              items={packageItems}
            />
          </section>
        )}

        {/* How it works */}
        <LandingHowItWorks />
      </main>

      <LandingFooter />
    </>
  );
}