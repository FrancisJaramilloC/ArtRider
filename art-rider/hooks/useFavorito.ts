"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUserFavIds, toggleFavorito as serverToggle } from "@/services/favoritosService";
import type { FavoritoTipo } from "@/services/favoritosService";

// ── Module-level store ─────────────────────────────────────────────────────────
// Compartido entre todas las instancias del hook — evita N requests por card.
// Solo se ejecuta en el cliente, por lo que no hay riesgo de leaks entre usuarios.

type StoreStatus = "idle" | "loading" | "loaded";

const store = {
  ids: new Set<string>(),           // "itemId:tipo"
  status: "idle" as StoreStatus,
  listeners: new Set<() => void>(),
};

function key(itemId: string, tipo: FavoritoTipo) {
  return `${itemId}:${tipo}`;
}

function subscribe(fn: () => void) {
  store.listeners.add(fn);
  return () => { store.listeners.delete(fn); };
}

function notify() {
  store.listeners.forEach(fn => fn());
}

export function invalidateFavStore() {
  store.status = "idle";
  store.ids.clear();
  notify();
}

async function ensureLoaded() {
  if (store.status !== "idle") return;
  store.status = "loading";
  try {
    const { equipoIds, paqueteIds } = await getUserFavIds();
    equipoIds.forEach(id => store.ids.add(key(id, "equipo")));
    paqueteIds.forEach(id => store.ids.add(key(id, "paquete")));
  } catch {
    store.status = "idle"; // allow retry
    return;
  }
  store.status = "loaded";
  notify();
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useFavorito(itemId: string, tipo: FavoritoTipo = "equipo") {
  const router = useRouter();
  const [, tick] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribe(() => tick(n => n + 1));
    ensureLoaded();
    return unsub;
  }, []);

  const esFavorito = store.ids.has(key(itemId, tipo));

  const toggleFavorito = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (loading || store.status === "loading") return;

      // Optimistic
      const k = key(itemId, tipo);
      const was = store.ids.has(k);
      if (was) store.ids.delete(k);
      else store.ids.add(k);
      notify();

      setLoading(true);
      const result = await serverToggle(itemId, tipo);
      setLoading(false);

      if (result.error === "not_authenticated") {
        // Rollback
        if (was) store.ids.add(k);
        else store.ids.delete(k);
        notify();
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      // Sync con respuesta real
      if (result.esFavorito) store.ids.add(k);
      else store.ids.delete(k);
      notify();
    },
    [itemId, tipo, loading, router],
  );

  return { esFavorito, toggleFavorito, loading };
}
