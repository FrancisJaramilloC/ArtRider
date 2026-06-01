"use client";

import { Heart } from "lucide-react";
import { useFavorito } from "@/hooks/useFavorito";
import type { FavoritoTipo } from "@/services/favoritosService";

interface FavoriteButtonProps {
  itemId: string;
  tipo?: FavoritoTipo;
  size?: number;
  className?: string;
}

export default function FavoriteButton({
  itemId,
  tipo = "equipo",
  size = 22,
  className = "",
}: FavoriteButtonProps) {
  const { esFavorito, toggleFavorito } = useFavorito(itemId, tipo);

  return (
    <button
      onClick={toggleFavorito}
      aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${className}`}
    >
      <Heart
        size={size}
        strokeWidth={2}
        className={
          esFavorito
            ? "fill-[#C026D3] text-[#C026D3]"
            : "fill-black/30 text-white"
        }
      />
    </button>
  );
}
