"use client";

import { Heart } from "lucide-react";
import { useFavorito } from "@/hooks/useFavorito";

export default function PackageActions({ packageId }: { packageId: string }) {
  const { esFavorito, toggleFavorito, loading } = useFavorito(packageId, "paquete");

  return (
    <button
      onClick={toggleFavorito}
      disabled={loading}
      aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      <Heart
        size={16}
        className={esFavorito ? "fill-[#C026D3] text-[#C026D3]" : ""}
      />
      {esFavorito ? "Guardado" : "Guardar"}
    </button>
  );
}
