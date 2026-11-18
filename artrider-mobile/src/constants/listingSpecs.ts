/**
 * Esquema de especificaciones de un equipo (`listings.specs`, jsonb). Se define AQUÍ, en código, y cada documento guarda
 * `schema_version` para poder evolucionarlo sin romper lo ya guardado. Todos los campos son opcionales pero recomendados:
 * el indicador «Calidad de tu publicación» aconseja, NUNCA bloquea la publicación.
 *
 * Compatibilidad con la web (art-rider, panel de administración): se reutilizan SUS claves cuando el dato es el mismo
 * (`environment`, `consumo_watts`, `potencia_watts_rms`, `incluye_dmx`, `tipo_video`, `tamano`) y se conservan intactas las que
 * este esquema no conoce (`tipo_sistema`, `max_spl`, `cobertura_personas`, `incluye_subwoofer`, `tipo_iluminacion`) al editar.
 *
 * Sin dependencias: se prueba con `pnpm test:listing`.
 */

export const SPEC_SCHEMA_VERSION = 1;

type Option = { value: string; label: string };

export type SpecField =
  | { kind: 'choice'; key: string; label: string; options: Option[]; important?: boolean; tip?: string }
  | { kind: 'number'; key: string; label: string; unit?: string; max: number; important?: boolean; tip?: string }
  | { kind: 'text'; key: string; label: string; placeholder?: string; maxLength: number; important?: boolean; tip?: string }
  | { kind: 'boolean'; key: string; label: string; important?: boolean; tip?: string };

const OTHER: Option = { value: 'otro', label: 'Otro' };

export const CATEGORY_SPEC_FIELDS: Record<string, SpecField[]> = {
  audio: [
    {
      kind: 'choice',
      key: 'tipo_equipo',
      label: 'Tipo de equipo',
      important: true,
      tip: 'Indica si es altavoz, subwoofer, consola o micrófono',
      options: [
        { value: 'altavoz_activo', label: 'Altavoz activo' },
        { value: 'altavoz_pasivo', label: 'Altavoz pasivo' },
        { value: 'subwoofer', label: 'Subwoofer' },
        { value: 'consola', label: 'Consola' },
        { value: 'microfono', label: 'Micrófono' },
        OTHER,
      ],
    },
    { kind: 'number', key: 'potencia_watts_rms', label: 'Potencia', unit: 'W', max: 100000, important: true, tip: 'La potencia ayuda a calcular para cuántas personas sirve' },
    { kind: 'text', key: 'entradas', label: 'Entradas', placeholder: 'Ej. 2 XLR/TRS, 1 RCA', maxLength: 80 },
    { kind: 'boolean', key: 'incluye_cables', label: 'Incluye cables y soportes' },
  ],
  lighting: [
    {
      kind: 'choice',
      key: 'tipo_equipo',
      label: 'Tipo de equipo',
      important: true,
      tip: 'Indica si es par LED, cabeza móvil, barra, láser…',
      options: [
        { value: 'par_led', label: 'Par LED' },
        { value: 'cabeza_movil', label: 'Cabeza móvil' },
        { value: 'barra_led', label: 'Barra LED' },
        { value: 'reflector', label: 'Reflector' },
        { value: 'laser', label: 'Láser' },
        { value: 'estrobo', label: 'Estrobo' },
        OTHER,
      ],
    },
    { kind: 'number', key: 'cantidad_leds', label: 'Cantidad de LEDs o lámparas', max: 10000 },
    { kind: 'number', key: 'potencia_watts', label: 'Potencia', unit: 'W', max: 100000, important: true },
    { kind: 'boolean', key: 'incluye_dmx', label: 'Control DMX', important: true, tip: 'Di si se controla por DMX' },
    {
      kind: 'choice',
      key: 'ip_rating',
      label: 'Protección contra agua y polvo',
      options: [
        { value: 'IP20', label: 'IP20 (interior)' },
        { value: 'IP44', label: 'IP44' },
        { value: 'IP54', label: 'IP54' },
        { value: 'IP65', label: 'IP65 (exterior)' },
        { value: 'IP67', label: 'IP67' },
      ],
    },
  ],
  video: [
    {
      kind: 'choice',
      key: 'tipo_video',
      label: 'Tipo de equipo',
      important: true,
      tip: 'Indica si es proyector, pantalla LED o TV',
      options: [
        { value: 'Proyector', label: 'Proyector' },
        { value: 'Pantalla LED', label: 'Pantalla LED' },
        { value: 'TV', label: 'TV o monitor' },
        OTHER,
      ],
    },
    {
      kind: 'choice',
      key: 'resolucion',
      label: 'Resolución',
      important: true,
      options: [
        { value: '720p', label: 'HD (720p)' },
        { value: '1080p', label: 'Full HD (1080p)' },
        { value: '4k', label: '4K' },
        OTHER,
      ],
    },
    { kind: 'number', key: 'brillo_lumenes', label: 'Brillo (proyectores)', unit: 'lúmenes', max: 100000 },
    { kind: 'number', key: 'tamano', label: 'Tamaño', unit: 'pulgadas', max: 1000, tip: 'El tamaño de la pantalla, en pulgadas' },
    { kind: 'text', key: 'entradas', label: 'Entradas', placeholder: 'Ej. 2 HDMI, 1 VGA', maxLength: 80 },
  ],
  effects: [
    {
      kind: 'choice',
      key: 'tipo_equipo',
      label: 'Tipo de efecto',
      important: true,
      tip: 'Indica si es humo, neblina, chispas frías, confeti…',
      options: [
        { value: 'humo', label: 'Humo' },
        { value: 'neblina', label: 'Neblina' },
        { value: 'chispas_frias', label: 'Chispas frías' },
        { value: 'confeti', label: 'Confeti' },
        { value: 'burbujas', label: 'Burbujas' },
        OTHER,
      ],
    },
    { kind: 'boolean', key: 'incluye_consumibles', label: 'Incluye líquido o consumibles', important: true },
    {
      kind: 'choice',
      key: 'control',
      label: 'Control',
      options: [
        { value: 'dmx', label: 'DMX' },
        { value: 'manual', label: 'Manual' },
        { value: 'ambos', label: 'DMX y manual' },
      ],
    },
  ],
  advertising: [
    {
      kind: 'choice',
      key: 'tipo_equipo',
      label: 'Tipo',
      important: true,
      tip: 'Indica si es pendón, arco, valla…',
      options: [
        { value: 'pendon', label: 'Pendón' },
        { value: 'arco', label: 'Arco' },
        { value: 'valla', label: 'Valla' },
        { value: 'mampara', label: 'Mampara' },
        OTHER,
      ],
    },
    { kind: 'text', key: 'medidas', label: 'Medidas', placeholder: 'Ej. 2 x 3 m', maxLength: 40, important: true, tip: 'Las medidas son lo primero que preguntan' },
  ],
};

export const COMMON_SPEC_FIELDS: SpecField[] = [
  {
    kind: 'choice',
    key: 'estado',
    label: 'Estado',
    important: true,
    tip: 'Di si está nuevo, bueno o usado',
    options: [
      { value: 'nuevo', label: 'Nuevo' },
      { value: 'bueno', label: 'Bueno' },
      { value: 'usado', label: 'Usado' },
    ],
  },
  {
    kind: 'choice',
    key: 'environment',
    label: 'Uso',
    options: [
      { value: 'Interiores', label: 'Interior' },
      { value: 'Exteriores', label: 'Exterior' },
      { value: 'Ambos', label: 'Ambos' },
    ],
  },
  { kind: 'number', key: 'anio_aproximado', label: 'Año aproximado', max: 2100 },
  { kind: 'text', key: 'accesorios', label: 'Accesorios incluidos', placeholder: 'Ej. Trípode y bolso de transporte', maxLength: 120 },
  { kind: 'boolean', key: 'requiere_operador', label: 'Necesita instalación u operador' },
  { kind: 'number', key: 'peso_kg', label: 'Peso aproximado', unit: 'kg', max: 5000 },
  { kind: 'number', key: 'consumo_watts', label: 'Consumo eléctrico', unit: 'W', max: 100000 },
];

/** Campos de una categoría (los suyos y luego los comunes). Una categoría desconocida solo tiene los comunes. */
export function specFieldsFor(category: string | null | undefined): SpecField[] {
  return [...(CATEGORY_SPEC_FIELDS[category ?? ''] ?? []), ...COMMON_SPEC_FIELDS];
}

const ALL_KNOWN_KEYS: ReadonlySet<string> = new Set([...Object.values(CATEGORY_SPEC_FIELDS).flat(), ...COMMON_SPEC_FIELDS].map((f) => f.key));

/** Valores de formulario: todo texto (lo que escribe o elige el Partner). Booleanos: 'si' | 'no'. Vacío = sin dato. */
export type SpecForm = Record<string, string>;

/** Documento guardado en `listings.specs`. */
export type ListingSpecs = Record<string, unknown> & { schema_version?: number };

/** Documento guardado → valores del formulario (para editar). Ignora claves que este esquema no conoce. */
export function specsToForm(category: string | null | undefined, specs: ListingSpecs | null | undefined): SpecForm {
  const form: SpecForm = {};
  if (!specs) return form;
  for (const field of specFieldsFor(category)) {
    const value = specs[field.key];
    if (value === undefined || value === null || value === '') continue;
    if (field.kind === 'boolean') {
      if (typeof value === 'boolean') form[field.key] = value ? 'si' : 'no';
    } else if (field.kind === 'number') {
      if (typeof value === 'number' && Number.isFinite(value)) form[field.key] = String(value);
    } else if (typeof value === 'string') {
      form[field.key] = value;
    }
  }
  return form;
}

/**
 * Valores del formulario → documento para guardar. Parte de `existing` para NO perder claves que este esquema no conoce
 * (p. ej. las que carga la web), quita las claves de OTRAS categorías (si cambió la categoría), omite lo vacío o inválido y
 * siempre fija `schema_version`.
 */
export function buildSpecs(category: string | null | undefined, form: SpecForm, existing?: ListingSpecs | null): ListingSpecs {
  const fields = specFieldsFor(category);
  const mine = new Set(fields.map((f) => f.key));
  const out: ListingSpecs = {};
  for (const [key, value] of Object.entries(existing ?? {})) {
    if (!ALL_KNOWN_KEYS.has(key) || mine.has(key)) out[key] = value; // desconocida (web): se conserva; propia: se recalcula abajo
  }
  for (const field of fields) {
    delete out[field.key];
    const raw = (form[field.key] ?? '').trim();
    if (!raw) continue;
    if (field.kind === 'boolean') {
      if (raw === 'si' || raw === 'no') out[field.key] = raw === 'si';
    } else if (field.kind === 'number') {
      const n = Number(raw.replace(',', '.'));
      if (Number.isFinite(n) && n >= 0 && n <= field.max) out[field.key] = n;
    } else if (field.kind === 'choice') {
      if (field.options.some((o) => o.value === raw)) out[field.key] = raw;
    } else {
      out[field.key] = raw.slice(0, field.maxLength);
    }
  }
  out.schema_version = SPEC_SCHEMA_VERSION;
  return out;
}

export type SpecQuality = {
  /** 0 a 100. */
  percent: number;
  filled: number;
  total: number;
  /** Hasta 3 consejos, empezando por lo más importante que falta. */
  tips: string[];
};

/** Los campos importantes valen doble. Es un consejo para el Partner: nunca impide publicar. */
export function specQuality(category: string | null | undefined, form: SpecForm): SpecQuality {
  const fields = specFieldsFor(category);
  let earned = 0;
  let possible = 0;
  let filled = 0;
  const missing: SpecField[] = [];
  for (const field of fields) {
    const weight = field.important ? 2 : 1;
    possible += weight;
    if ((form[field.key] ?? '').trim()) {
      earned += weight;
      filled += 1;
    } else {
      missing.push(field);
    }
  }
  missing.sort((a, b) => Number(!!b.important) - Number(!!a.important));
  return {
    percent: possible === 0 ? 0 : Math.round((earned / possible) * 100),
    filled,
    total: fields.length,
    tips: missing.slice(0, 3).map((f) => f.tip ?? `Agrega ${f.label.toLowerCase()}`),
  };
}

const TYPE_KEY: Record<string, string> = { audio: 'tipo_equipo', lighting: 'tipo_equipo', video: 'tipo_video', effects: 'tipo_equipo', advertising: 'tipo_equipo' };
const GENERIC_TYPE_LABEL: Record<string, string> = {
  audio: 'Equipo de audio',
  lighting: 'Iluminación',
  video: 'Equipo de video',
  effects: 'Efectos',
  advertising: 'Publicidad',
};

/** «Reflector», «Altavoz activo»…: el tipo elegido, o uno genérico de la categoría («Equipo de audio») si no hay. */
export function typeLabelFor(category: string | null | undefined, form: SpecForm): string {
  const key = TYPE_KEY[category ?? ''];
  const chosen = key ? form[key] : undefined;
  const field = key ? CATEGORY_SPEC_FIELDS[category ?? '']?.find((f) => f.key === key) : undefined;
  if (chosen && chosen !== 'otro' && field?.kind === 'choice') {
    const option = field.options.find((o) => o.value === chosen);
    if (option) return option.label;
  }
  return GENERIC_TYPE_LABEL[category ?? ''] ?? '';
}

export type SpecDisplayItem = { label: string; value: string };

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** Lo guardado, listo para mostrar («Potencia: 1000 W»). Salta lo vacío o inválido: nunca devuelve campos sin dato. */
export function specDisplayItems(category: string | null | undefined, specs: ListingSpecs | null | undefined): SpecDisplayItem[] {
  if (!specs || typeof specs !== 'object') return [];
  const items: SpecDisplayItem[] = [];
  for (const field of specFieldsFor(category)) {
    const value = specs[field.key];
    if (value === undefined || value === null || value === '') continue;
    if (field.kind === 'boolean') {
      if (typeof value === 'boolean') items.push({ label: field.label, value: value ? 'Sí' : 'No' });
    } else if (field.kind === 'number') {
      if (typeof value === 'number' && Number.isFinite(value)) items.push({ label: field.label, value: field.unit ? `${formatNumber(value)} ${field.unit}` : formatNumber(value) });
    } else if (field.kind === 'choice') {
      const option = typeof value === 'string' ? field.options.find((o) => o.value === value) : undefined;
      if (option) items.push({ label: field.label, value: option.label });
    } else if (typeof value === 'string' && value.trim()) {
      items.push({ label: field.label, value: value.trim() });
    }
  }
  return items;
}
