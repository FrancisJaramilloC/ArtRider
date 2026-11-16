/**
 * SOLO vista web de desarrollo: `expo-secure-store` no existe en navegador.
 * Se sustituye por localStorage (sin cifrado; no es un destino de producción).
 */
function read(key: string): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
}

export async function getItemAsync(key: string): Promise<string | null> {
  return read(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}
