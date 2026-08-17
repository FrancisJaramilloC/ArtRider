"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CartItem,
  CartMutationResult,
  CartState,
} from "@/types/cart";

const STORAGE_KEY = "artrider-cart-v1";

const EMPTY_CART: CartState = {
  items: [],
  startDate: null,
  endDate: null,
  source: "standard",
  proposalId: null,
  locked: false,
};

type CartContextValue = CartState & {
  hydrated: boolean;
  itemCount: number;
  addItem: (item: CartItem, startDate: string, endDate: string) => CartMutationResult;
  removeItem: (listingId: string) => void;
  setQuantity: (listingId: string, quantity: number) => void;
  replaceWithAdvisory: (
    items: CartItem[],
    eventDate: string,
    proposalId: string,
  ) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function dateOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function sanitizeStoredCart(value: unknown): CartState {
  if (!value || typeof value !== "object") return EMPTY_CART;
  const raw = value as Partial<CartState>;
  if (!Array.isArray(raw.items)) return EMPTY_CART;

  const items = raw.items
    .filter((item): item is CartItem => Boolean(
      item &&
      typeof item.listingId === "string" &&
      typeof item.title === "string" &&
      Number.isFinite(item.dailyPrice) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0,
    ))
    .slice(0, 25);

  return {
    items,
    startDate: typeof raw.startDate === "string" ? raw.startDate : null,
    endDate: typeof raw.endDate === "string" ? raw.endDate : null,
    source: raw.source === "advisory" ? "advisory" : "standard",
    proposalId: typeof raw.proposalId === "string" ? raw.proposalId : null,
    locked: raw.locked === true,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setCart(sanitizeStoredCart(JSON.parse(stored)));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const addItem = useCallback((item: CartItem, start: string, end: string): CartMutationResult => {
    const startDate = dateOnly(start);
    const endDate = dateOnly(end);
    if (cart.locked) return { ok: false, reason: "locked" };
    if (
      cart.items.length > 0 &&
      (cart.startDate !== startDate || cart.endDate !== endDate)
    ) return { ok: false, reason: "date_conflict" };

    const existing = cart.items.find((candidate) => candidate.listingId === item.listingId);
    const items = existing
      ? cart.items.map((candidate) => candidate.listingId === item.listingId
          ? { ...candidate, quantity: Math.min(20, candidate.quantity + Math.max(1, item.quantity)) }
          : candidate)
      : [...cart.items, { ...item, quantity: Math.max(1, item.quantity) }];

    setCart({
      items,
      startDate,
      endDate,
      source: "standard",
      proposalId: null,
      locked: false,
    });
    return { ok: true };
  }, [cart]);

  const removeItem = useCallback((listingId: string) => {
    setCart((current) => {
      if (current.locked) return current;
      const items = current.items.filter((item) => item.listingId !== listingId);
      return items.length ? { ...current, items } : EMPTY_CART;
    });
  }, []);

  const setQuantity = useCallback((listingId: string, quantity: number) => {
    setCart((current) => {
      if (current.locked) return current;
      const safeQuantity = Math.max(1, Math.min(20, Math.trunc(quantity)));
      return {
        ...current,
        items: current.items.map((item) => item.listingId === listingId
          ? { ...item, quantity: safeQuantity }
          : item),
      };
    });
  }, []);

  const replaceWithAdvisory = useCallback((items: CartItem[], eventDate: string, proposalId: string) => {
    const normalizedDate = dateOnly(eventDate);
    setCart({
      items: items.slice(0, 25),
      startDate: normalizedDate,
      endDate: normalizedDate,
      source: "advisory",
      proposalId,
      locked: false,
    });
  }, []);

  const clearCart = useCallback(() => setCart(EMPTY_CART), []);
  const itemCount = useMemo(
    () => cart.items.reduce((total, item) => total + item.quantity, 0),
    [cart.items],
  );

  const value = useMemo<CartContextValue>(() => ({
    ...cart,
    hydrated,
    itemCount,
    addItem,
    removeItem,
    setQuantity,
    replaceWithAdvisory,
    clearCart,
  }), [cart, hydrated, itemCount, addItem, removeItem, setQuantity, replaceWithAdvisory, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
}
