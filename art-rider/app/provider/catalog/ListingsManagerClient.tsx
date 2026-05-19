"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/services/listingsService";
import { togglePublish, deleteListing } from "@/services/listingsService";

//  Etiquetas de las categorias para el dashboard
const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", other: "Otro",
};

//  Client para gestionar los equipos del proveedor
export default function ListingsManagerClient({ listings: initial }: { listings: Listing[] }) {
  const [listings, setListings] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  //  Toggle para publicar/despublicar equipos
  const handleTogglePublish = (id: string, current: boolean) => {
    setLoadingId(id);
    startTransition(async () => {
      const result = await togglePublish(id, current);
      if (!result.error) {
        setListings((prev) =>
          prev.map((l) => l.id === id ? { ...l, is_published: !current } : l)
        );
      }
      setLoadingId(null);
    });
  };

  //  Eliminar equipo 
  const handleDelete = (id: string, title: string | null) => {
    if (!confirm(`¿Eliminar el equipo "${title ?? "sin título"}"? Esta acción no se puede deshacer.`)) return;
    setLoadingId(id);
    startTransition(async () => {
      const result = await deleteListing(id);
      if (!result.error) {
        setListings((prev) => prev.filter((l) => l.id !== id));
      }
      setLoadingId(null);
    });
  };

  //  Renderizado del cliente
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Lista de equipos */}
      {listings.map((listing) => {
        const isLoading = loadingId === listing.id;
        const priceDisplay = `$${(listing.daily_price / 100).toFixed(2)}`;

        //  Renderizado de cada equipo
        return (
          <div
            key={listing.id}
            className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity ${isLoading ? "opacity-50" : ""}`}
          >
            {/* Cover */}
            <div className="relative w-full h-40 bg-gray-100">
              {listing.cover_image_url ? (
                <Image src={listing.cover_image_url} alt={listing.title ?? "Equipo"} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
              )}
              {/* Estado del equipo */}
              <span className={`absolute top-2 right-2 text-xs font-semibold px-2.5 py-1 rounded-full ${listing.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {listing.is_published ? "Publicado" : "Borrador"}
              </span>
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-xs text-gray-400 font-medium mb-0.5">
                {CATEGORY_LABELS[listing.category ?? ""] ?? listing.category}
              </p>
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                {listing.title ?? "Sin título"}
              </h3>
              {listing.brand && (
                <p className="text-xs text-gray-400">{listing.brand} {listing.model}</p>
              )}
              <p className="text-base font-bold text-[#875B9A] mt-2">{priceDisplay} <span className="text-xs font-normal text-gray-400">/ día</span></p>
            </div>

            {/* Acciones */}
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-2">
              {/* Enlace para editar */}
              <Link
                href={`/provider/catalog/${listing.id}/edit`}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Editar
              </Link>

              <div className="flex items-center gap-2">
                {/* Boton para publicar/despublicar */}
                <button
                  onClick={() => handleTogglePublish(listing.id, listing.is_published)}
                  disabled={isLoading}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    listing.is_published
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-purple-50 text-[#875B9A] hover:bg-purple-100"
                  }`}
                >
                  {listing.is_published ? "Despublicar" : "Publicar"}
                </button>

                {/* Boton para eliminar */}
                <button
                  onClick={() => handleDelete(listing.id, listing.title)}
                  disabled={isLoading}
                  className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
