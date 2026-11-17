/**
 * Normalización de ciudades solo para presentación y agrupación.
 * Los datos pueden traer «Loja» y «Loja, Ecuador» para el mismo lugar; ambos deben
 * caer en la misma sección y filtro.
 */

/** Texto a mostrar: lo que va antes de la primera coma, sin espacios sobrantes. */
export function cityLabel(raw: string): string {
  return raw.split(',')[0].trim();
}

/** Clave de comparación: sin acentos, sin mayúsculas y sin el sufijo de país. */
export function cityKey(raw: string): string {
  return cityLabel(raw)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}


/** Ciudad lista para mostrar, o null si no hay dato o el dato es solo el país (nunca se muestra «Ecuador»). */
export function cityOrNull(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const label = cityLabel(raw);
  return label.length === 0 || cityKey(label) === 'ecuador' ? null : label;
}

type MaybeAddress = { city?: string | null } | { city?: string | null }[] | null | undefined;

/** Un embed de Supabase puede llegar como objeto o como arreglo de uno. */
function addressCity(address: MaybeAddress): string | null {
  const one = Array.isArray(address) ? address[0] : address;
  return cityOrNull(one?.city);
}

/**
 * Ciudad de un paquete con los datos existentes: primero la de la dirección del paquete; si no tiene,
 * la del primer equipo (por orden) que sí la tenga. Si no hay ninguna → null (se oculta la línea).
 */
export function resolvePackageCity(pkg: { address?: MaybeAddress; items?: { listing?: { address?: MaybeAddress } | { address?: MaybeAddress }[] | null }[] | null }): string | null {
  const own = addressCity(pkg.address);
  if (own) return own;
  for (const item of pkg.items ?? []) {
    const listing = Array.isArray(item.listing) ? item.listing[0] : item.listing;
    const c = addressCity(listing?.address);
    if (c) return c;
  }
  return null;
}
