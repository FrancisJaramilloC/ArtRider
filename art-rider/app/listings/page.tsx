/**
 * app/listings/page.tsx — Componente del servidor (no "use client")
 *
 * Vista de catálogo público. Renderiza la cuadrícula completa de listados publicados.
 *
 * Modelo de renderizado:
 *   - Este es un Componente de Servidor de React: se ejecuta solo en el servidor.
 *   - Llama a getListings() directamente (no fetch(), no useEffect()).
 *   - Renderiza componentes cliente <ListingCard> pasando objetos serializables.
 *     Next.js serializa esos props automáticamente a través del límite Servidor/Cliente
 *   - No auth gate — esta ruta es 100% pública.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getListings } from "@/services/listingsService";
import ListingCard from "@/components/features/listings/ListingCard";
import { ChevronRight } from "lucide-react";

//  Metadatos de la página 

export const metadata: Metadata = {
  title: "Equipment Catalog | ArtRider",
  description:
    "Browse professional audio, lighting, and instrument rental listings on ArtRider — the peer-to-peer marketplace for creative equipment.",
};

//  Pagina principal  

export default async function ListingsPage() {
  // Llamada asíncrona directa — los componentes de servidor pueden ser async
  const listings = await getListings();

  return (
    <main
      className="min-h-screen bg-white pb-20"
    >
      {/* Header de la pagina */}
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

      {/*  Catalogo agrupado por ciudad  */}
      <section
        aria-label="Available equipment listings by city"
        className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-12"
      >
        {listings.length === 0 ? (
          /*  Estado vacío  */
          <div
            className="flex flex-col items-center justify-center text-center bg-gray-50 border border-gray-200 rounded-2xl"
            style={{ padding: "72px 32px", gap: "16px" }}
            role="status"
            aria-live="polite"
          >
            <span style={{ fontSize: "3rem" }} aria-hidden="true">
              📭
            </span>
            <h2 className="text-lg font-semibold text-gray-900">
              Aún no hay equipos disponibles
            </h2>
            <p className="text-sm text-gray-500 max-w-[340px]">
              ¡Sé el primero! Los proveedores pueden publicar equipos desde
              su panel de control.
            </p>
          </div>
        ) : (
          /*  Carousels por ciudad  */
          Object.entries(
            listings.reduce((acc, listing: any) => {
              const addr = Array.isArray(listing.address) ? listing.address[0] : listing.address;
              const city = addr?.city?.trim() || "Otras ubicaciones";
              if (!acc[city]) acc[city] = [];
              acc[city].push(listing);
              return acc;
            }, {} as Record<string, typeof listings>)
          )
            .sort(([, aList], [, bList]) => bList.length - aList.length)
            .map(([city, cityListings]) => (
              <div key={city} className="space-y-4">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/explore?city=${encodeURIComponent(city)}`}
                    className="group inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                      Novedades en {city}
                    </h2>
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 group-hover:bg-[#875B9A] group-hover:text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </Link>
                </div>

                {/*  Contenedor scroll horizontal (Carrusel)  */}
                <div className="flex overflow-x-auto gap-4 sm:gap-5 pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6">
                  {cityListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="snap-start shrink-0 w-[280px] sm:w-[320px] lg:w-[280px]"
                    >
                      <ListingCard listing={listing} />
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}

        {/*  Footer con contador de equipos  */}
        {listings.length > 0 && (
          <p className="text-xs text-center text-gray-400 mt-10">
            Mostrando <strong className="text-gray-600">{listings.length}</strong>{" "}
            {listings.length === 1 ? "equipo publicado" : "equipos publicados"}
          </p>
        )}
      </section>
    </main>
  );
}
