import * as SecureStore from 'expo-secure-store';

/** Últimos elementos elegidos en un selector (solo ids), guardados con el almacenamiento que ya usa la app. */
const MAX_RECENTS = 5;

function keyFor(scope: string): string {
  return `artrider.recent.${scope}`;
}

export async function loadRecentIds(scope: string): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(scope));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

/** Pone `id` primero y deja como máximo 5. Devuelve la lista nueva (aunque falle el guardado). */
export async function rememberId(scope: string, id: string, current: string[]): Promise<string[]> {
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_RECENTS);
  try {
    await SecureStore.setItemAsync(keyFor(scope), JSON.stringify(next));
  } catch {
    // Sin almacenamiento: los recientes solo viven en memoria durante la sesión.
  }
  return next;
}

/** Ajuste simple de un valor suelto (p. ej. el equipo fijado del calendario). */
export async function loadSetting(name: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(`artrider.${name}`);
  } catch {
    return null;
  }
}

export async function saveSetting(name: string, value: string | null): Promise<void> {
  try {
    if (value === null) await SecureStore.deleteItemAsync(`artrider.${name}`);
    else await SecureStore.setItemAsync(`artrider.${name}`, value);
  } catch {
    // Sin almacenamiento: el ajuste no persiste.
  }
}
