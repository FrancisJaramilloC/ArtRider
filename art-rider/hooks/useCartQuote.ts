"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import type { CartQuote } from "@/types/cart";

export function useCartQuote() {
  const cart = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestKey = useMemo(() => JSON.stringify({
    items: cart.items.map((item) => ({ listingId: item.listingId, quantity: item.quantity })),
    startDate: cart.startDate,
    endDate: cart.endDate,
    proposalId: cart.proposalId,
  }), [cart.items, cart.startDate, cart.endDate, cart.proposalId]);

  useEffect(() => {
    if (!cart.hydrated || !cart.items.length || !cart.startDate || !cart.endDate) {
      const timer = window.setTimeout(() => {
        setQuote(null);
        setError(null);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    const payload = JSON.parse(requestKey);

    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || "No se pudo cotizar el carrito.");
        setQuote(result.quote);
      })
      .catch((reason) => {
        if (reason?.name !== "AbortError") {
          setQuote(null);
          setError(reason instanceof Error ? reason.message : "No se pudo cotizar el carrito.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [cart.hydrated, cart.items.length, cart.startDate, cart.endDate, requestKey]);

  return { quote, error, loading };
}
