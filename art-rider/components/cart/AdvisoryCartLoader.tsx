"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import type { CartItem } from "@/types/cart";

export default function AdvisoryCartLoader({
  items,
  eventDate,
  proposalId,
}: {
  items: CartItem[];
  eventDate: string;
  proposalId: string;
}) {
  const { hydrated, replaceWithAdvisory } = useCart();
  const router = useRouter();
  const loaded = useRef(false);

  useEffect(() => {
    if (!hydrated || loaded.current) return;
    loaded.current = true;
    replaceWithAdvisory(items, eventDate, proposalId);
    router.replace("/cart");
  }, [eventDate, hydrated, items, proposalId, replaceWithAdvisory, router]);

  return <div className="py-24 text-center text-gray-500">Preparando el carrito de tu rider…</div>;
}
