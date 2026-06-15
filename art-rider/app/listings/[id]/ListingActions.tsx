"use client";

import { Heart } from "lucide-react";
import { useFavorito } from "@/hooks/useFavorito";

export default function ListingActions({ listingId }: { listingId: string }) {
  const { esFavorito, toggleFavorito, loading } = useFavorito(listingId, "equipo");

  return (
    <button
      onClick={toggleFavorito}
      disabled={loading}
      aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
      className="flex items-center gap-1.5 text-[13.5px] font-bold text-gray-700 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      <Heart
        size={16}
        className={esFavorito ? "fill-[#C026D3] text-[#C026D3]" : ""}
      />
      {esFavorito ? "Guardado" : "Guardar"}
    </button>
  );
}
