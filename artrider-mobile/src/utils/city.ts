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
