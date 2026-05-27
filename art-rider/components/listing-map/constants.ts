// ── Constantes del módulo de mapa ────────────────────────────────────────────

/** Centro por defecto del mapa (Loja, Ecuador) */
export const DEFAULT_CENTER: [number, number] = [-79.20422, -3.99313];

/** Labels de categorías en español */
export const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido",
  lighting: "Iluminación",
  video: "Video",
  effects: "Efectos",
  other: "Otro",
};

/** Formatea centavos a precio legible */
export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

/**
 * Forma de cada entrada de configuración de road labels.
 *
 * - `letterSpacing` es opcional: solo las vías principales lo usan.
 * - `textSize` y `letterSpacing` son pares [zoom, value, zoom, value, ...]
 *   que MapLibre interpola linealmente.
 *
 * Al tipar el array como `readonly RoadLabelConfig[]` (en lugar de `as const`)
 * evitamos que TypeScript infiera 4 tipos literales distintos en la unión,
 * lo que haría inaccesible `letterSpacing` en los miembros que no lo definen.
 */
export type RoadLabelConfig = {
  readonly layerId: string;
  readonly zoomRange: readonly [number, number];
  readonly textSize: readonly number[];
  readonly textColor: string;
  readonly haloWidth: number;
  /** Pares [zoom, spacing] para interpolación lineal. Omitir si no aplica. */
  readonly letterSpacing?: readonly number[];
};

export const ROAD_LABEL_CONFIG: readonly RoadLabelConfig[] = [
  {
    layerId: "roadname_major",
    zoomRange: [10, 24],
    textSize: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    textColor: "rgba(220, 220, 220, 1)",
    haloWidth: 2,
    letterSpacing: [10, 0.05, 16, 0.15],
  },
  {
    layerId: "roadname_pri",
    zoomRange: [12, 24],
    textSize: [12, 10, 14, 13, 16, 15, 18, 17],
    textColor: "rgba(200, 200, 200, 1)",
    haloWidth: 1.5,
  },
  {
    layerId: "roadname_sec",
    zoomRange: [14, 24],
    textSize: [14, 9, 15, 11, 16, 13, 18, 15],
    textColor: "rgba(170, 170, 170, 1)",
    haloWidth: 1.5,
  },
  {
    layerId: "roadname_minor",
    zoomRange: [15, 24],
    textSize: [15, 9, 16, 11, 17, 12, 18, 14],
    textColor: "rgba(155, 155, 155, 1)",
    haloWidth: 1.5,
  },
];
