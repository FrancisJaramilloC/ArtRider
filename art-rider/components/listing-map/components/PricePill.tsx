import { formatPrice } from "../constants";

/** Pill de precio que se muestra como marcador sobre el mapa */
export function PricePill({ price, isActive }: { price: number; isActive: boolean }) {
  return (
    <div
      className={`
        px-3 py-1.5 rounded-full font-bold text-[13px] leading-none
        whitespace-nowrap border transition-all duration-150 ease-out
        ${
          isActive
            ? "bg-white text-zinc-900 border-white scale-105 shadow-lg shadow-white/20"
            : "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-md hover:bg-zinc-700"
        }
      `}
    >
      {formatPrice(price)}
    </div>
  );
}
