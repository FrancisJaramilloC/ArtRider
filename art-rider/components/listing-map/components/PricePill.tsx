import { formatPrice } from "../constants";

/**
 * Pastilla de precio sobre el mapa.
 * Reposo: gris oscuro/negro (Airbnb style).
 * Activo: fondo blanco con sombra morada ArtRider.
 */
export function PricePill({ price, isActive }: { price: number; isActive: boolean }) {
  return (
    <div
      className={`
        px-3 py-[5px] rounded-full font-semibold text-[12px] leading-none
        whitespace-nowrap shadow-md transition-all duration-150 ease-out
        ${
          isActive
            ? "bg-white text-gray-900 scale-110 shadow-lg shadow-black/20 ring-1 ring-gray-200"
            : "bg-gray-900 text-white hover:bg-[#875B9A] hover:scale-105"
        }
      `}
    >
      {formatPrice(price)}
    </div>
  );
}
