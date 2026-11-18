/**
 * Calidad de los datos de un equipo (marca, modelo, título). Funciones puras, sin dependencias: se prueban con
 * `pnpm test:listing`. Principio: datos estructurados para máquinas (marca/modelo limpios), texto libre para personas (título).
 */

export const BRAND_MAX = 30;
export const MODEL_MAX = 40;
export const TITLE_MIN = 12;
export const TITLE_MAX = 60;

/** Quita espacios al inicio y al final y reduce los espacios múltiples a uno. */
export function collapseSpaces(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Clave de comparación: sin mayúsculas, acentos ni espacios de más. «SONIC», «sonic » y «Sónic» → «sonic». */
export function brandKey(raw: string): string {
  return collapseSpaces(raw).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const hasLower = (s: string) => /\p{Ll}/u.test(s);
const hasUpper = (s: string) => /\p{Lu}/u.test(s);

/**
 * Capitalización consistente de una marca nueva: si viene TODA en mayúsculas o TODA en minúsculas se pasa a «Primera Mayúscula» por
 * palabra, salvo siglas cortas en mayúsculas (JBL, AKG, DJ). Si ya trae mayúsculas y minúsculas mezcladas (Pioneer DJ) se respeta.
 */
function applyBrandCasing(cleaned: string): string {
  if (hasLower(cleaned) && hasUpper(cleaned)) return cleaned;
  const upperInput = !hasLower(cleaned);
  return cleaned
    .split(' ')
    .map((word) => {
      if (upperInput && word.length <= 3) return word; // sigla corta: JBL, AKG, DJ
      const [first = '', ...rest] = Array.from(word.toLowerCase());
      return first.toUpperCase() + rest.join('');
    })
    .join(' ');
}

/**
 * Marca lista para guardar: sin espacios de más y con capitalización consistente. Si ya existe una marca equivalente
 * (misma `brandKey`) en `known`, se usa EXACTAMENTE su escritura, así «Sonic», «SONIC» y «sonic» son una sola marca.
 */
export function normalizeBrand(raw: string, known: readonly string[] = []): string {
  const cleaned = collapseSpaces(raw);
  if (!cleaned) return '';
  const key = brandKey(cleaned);
  const match = known.find((candidate) => brandKey(candidate) === key);
  return match ? collapseSpaces(match) : applyBrandCasing(cleaned);
}

/**
 * Marcas distintas para sugerir, a partir de todas las que hay en la base (con repeticiones): agrupa por `brandKey` y, de cada
 * grupo, deja la escritura más usada (si empatan, la que mezcla mayúsculas y minúsculas). Orden: más usadas primero.
 */
export function canonicalBrands(allBrands: readonly (string | null | undefined)[]): string[] {
  const groups = new Map<string, Map<string, number>>();
  for (const raw of allBrands) {
    const cleaned = collapseSpaces(raw ?? '');
    if (!cleaned) continue;
    const key = brandKey(cleaned);
    const variants = groups.get(key) ?? new Map<string, number>();
    variants.set(cleaned, (variants.get(cleaned) ?? 0) + 1);
    groups.set(key, variants);
  }
  const ranked = Array.from(groups.values()).map((variants) => {
    const entries = Array.from(variants.entries());
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    entries.sort((a, b) => b[1] - a[1] || Number(hasLower(b[0]) && hasUpper(b[0])) - Number(hasLower(a[0]) && hasUpper(a[0])) || a[0].localeCompare(b[0]));
    return { name: entries[0][0], total };
  });
  ranked.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return ranked.map((r) => r.name);
}

/** Sugerencias de marca para lo que el Partner lleva escrito (sin importar mayúsculas ni acentos); vacío si coincide exacto. */
export function suggestBrands(typed: string, known: readonly string[], limit = 5): string[] {
  const key = brandKey(typed);
  if (!key) return [];
  const matches = known.filter((b) => brandKey(b).includes(key) && brandKey(b) !== key);
  matches.sort((a, b) => Number(brandKey(b).startsWith(key)) - Number(brandKey(a).startsWith(key)));
  return matches.slice(0, limit);
}

export function validateBrand(brand: string, title: string): string | null {
  const cleaned = collapseSpaces(brand);
  if (!cleaned) return 'Escribe la marca del equipo, por ejemplo Sonic o JBL';
  if (cleaned.length > BRAND_MAX) return `La marca es muy larga (máximo ${BRAND_MAX} caracteres). Escribe solo la marca, no el nombre completo del equipo`;
  if (brandKey(cleaned) === brandKey(title)) return 'La marca no puede ser igual al título. Escribe solo la marca, por ejemplo Sonic';
  return null;
}

export function validateModel(model: string): string | null {
  const cleaned = collapseSpaces(model);
  if (!cleaned) return 'Escribe el modelo del equipo, como aparece en la etiqueta o la caja';
  if (cleaned.length > MODEL_MAX) return `El modelo es muy largo (máximo ${MODEL_MAX} caracteres)`;
  return null;
}

/** Clave para buscar el modelo dentro del título: sin mayúsculas, acentos ni espacios. */
const compactKey = (s: string) => brandKey(s).replace(/\s+/g, '');

/** ¿Hay en el texto algo que parezca un teléfono? (una secuencia de 7 o más dígitos, con separadores comunes). */
function hasPhoneNumber(text: string): boolean {
  const runs = text.match(/\+?\d[\d\s().-]*\d/g) ?? [];
  return runs.some((run) => run.replace(/\D/g, '').length >= 7);
}

const PRICE_PATTERN = /[$€]|\b(?:usd|d[oó]lar(?:es)?|precio|barato|oferta)\b/i;

/**
 * Reglas del título: 12 a 60 caracteres, sin TODO EN MAYÚSCULAS, sin teléfonos, precios ni emojis, y debe contener el modelo.
 * Los mensajes están en español claro (sin tecnicismos).
 */
export function validateTitle(title: string, model: string): string | null {
  const cleaned = collapseSpaces(title);
  if (!cleaned) return 'Escribe un título para tu anuncio';
  if (cleaned.length < TITLE_MIN) return `El título es muy corto (mínimo ${TITLE_MIN} caracteres)`;
  if (cleaned.length > TITLE_MAX) return `El título es muy largo (máximo ${TITLE_MAX} caracteres)`;
  const letters = cleaned.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 5 && !hasLower(letters)) return 'Evita escribir todo el título en mayúsculas';
  if (/\p{Extended_Pictographic}/u.test(cleaned)) return 'Quita los emojis del título';
  if (hasPhoneNumber(cleaned)) return 'No pongas teléfonos en el título: los Riders te escriben por la app';
  if (PRICE_PATTERN.test(cleaned)) return 'No pongas precios ni ofertas en el título: el precio se configura aparte';
  const modelKey = compactKey(model);
  if (modelKey && !compactKey(cleaned).includes(modelKey)) return `El título debe incluir el modelo (${collapseSpaces(model)})`;
  return null;
}

/**
 * Título sugerido «Marca Modelo · tipo de equipo» (ej. «Sonic U-IP-P180/4 · Reflector LED»). Si no cabe en 60 caracteres se
 * quita el tipo y, si aún no cabe, la marca (el modelo siempre se conserva). Si el modelo ya empieza con la marca no la repite.
 */
export function suggestTitle(brand: string, model: string, typeLabel: string): string {
  const b = collapseSpaces(brand);
  const m = collapseSpaces(model);
  if (!m) return '';
  const type = collapseSpaces(typeLabel);
  const head = !b || brandKey(m).startsWith(brandKey(b)) ? m : `${b} ${m}`;
  const withType = type ? `${head} · ${type}` : head;
  if (withType.length <= TITLE_MAX) return withType;
  if (head.length <= TITLE_MAX) return head;
  return m;
}
