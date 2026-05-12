import { formatPrice } from "../constants";

/** Pill de precio que se muestra como marcador sobre el mapa */
export function PricePill({ price, isActive }: { price: number; isActive: boolean }) {
  return (
    <div
      className={`
        px-3 py-1.5 rounded-full font-bold text-[13px] tracking-tight
        transition-all duration-200 ease-out cursor-pointer shadow-md
        ${
          isActive
            ? "bg-white text-black scale-110 shadow-xl shadow-white/20 z-50 relative"
            : "bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 hover:scale-105 relative z-10"
        }
      `}
    >
      {formatPrice(price)}
    </div>
  );
}
