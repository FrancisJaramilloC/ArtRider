/** Búsqueda y agrupación del selector de equipos: sin importar tildes ni mayúsculas. */

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Partes de un texto para resaltar la coincidencia con la búsqueda (sin tildes ni mayúsculas). */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const q = normalizeText(query.trim());
  if (!q) return [{ text, match: false }];
  const normalized = normalizeText(text);
  const token = q.split(/\s+/).find((t) => normalized.includes(t));
  // Si la normalización cambió el largo, los índices ya no coinciden: no se resalta.
  if (!token || normalized.length !== text.length) return [{ text, match: false }];
  const start = normalized.indexOf(token);
  const end = start + token.length;
  return [
    { text: text.slice(0, start), match: false },
    { text: text.slice(start, end), match: true },
    { text: text.slice(end), match: false },
  ].filter((part) => part.text.length > 0);
}

/** ¿El texto de búsqueda (ya normalizado) contiene todas las palabras de la consulta? */
export function matchesQuery(searchText: string, query: string): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  return q.split(/\s+/).every((token) => searchText.includes(token));
}

/** Letra de sección A–Z (o «#» si no empieza con letra). */
export function sectionLetter(title: string): string {
  const first = normalizeText(title.trim()).charAt(0).toUpperCase();
  return first >= 'A' && first <= 'Z' ? first : '#';
}
