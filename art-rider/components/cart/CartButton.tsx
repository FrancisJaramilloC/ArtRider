"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export function CartButton() {
  const { itemCount, hydrated } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Carrito${itemCount ? `, ${itemCount} artículos` : " vacío"}`}
      className="relative inline-flex w-9 h-9 items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
    >
      <ShoppingCart className="w-[18px] h-[18px]" />
      {hydrated && itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#875B9A] text-white text-[9px] font-bold flex items-center justify-center">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
