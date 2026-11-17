import type { FavoritoTipo } from '@/services/favoritosService';

/**
 * Aviso en memoria de que un favorito cambió, para sincronizar corazones, badge y la lista de
 * Favoritos sin recargar pantallas ni tocar la base de datos.
 */
export type FavoriteChange = { id: string; tipo: FavoritoTipo; esFavorito: boolean };
type Listener = (change: FavoriteChange) => void;

const listeners = new Set<Listener>();
/** Último estado conocido por ítem: las tarjetas que se vuelven a montar no vuelven a un dato viejo. */
const latest = new Map<string, boolean>();
const keyOf = (id: string, tipo: FavoritoTipo) => `${tipo}:${id}`;

export function getKnownFavorite(id: string, tipo: FavoritoTipo): boolean | undefined {
  return latest.get(keyOf(id, tipo));
}

export function emitFavoriteChange(change: FavoriteChange): void {
  latest.set(keyOf(change.id, change.tipo), change.esFavorito);
  listeners.forEach((l) => l(change));
}

/** Suscripción; devuelve la función para cancelar. */
export function onFavoriteChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
