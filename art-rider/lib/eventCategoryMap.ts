// ── Tipos de evento y mapeo a categorías de equipos ──────────────────────────
// Usado por: SearchDiscoveryPanel (home), ExploreClient (resultados)

export const EVENT_TYPES = [
  { id: "fiesta",      label: "Fiesta privada",         subtitle: "Audio · Iluminación · Efectos",           categories: ["audio", "lighting", "effects"] },
  { id: "boda",        label: "Boda",                   subtitle: "Audio · Video · Iluminación · Efectos",   categories: ["audio", "video", "lighting", "effects"] },
  { id: "graduacion",  label: "Graduación",             subtitle: "Audio · Video · Iluminación",             categories: ["audio", "video", "lighting"] },
  { id: "concierto",   label: "Concierto",              subtitle: "Audio · Iluminación · Efectos",           categories: ["audio", "lighting", "effects"] },
  { id: "corporativo", label: "Evento corporativo",     subtitle: "Audio · Video · Iluminación",             categories: ["audio", "video", "lighting"] },
  { id: "publicidad",  label: "Campaña publicitaria",   subtitle: "Publicidad · Video · Iluminación",        categories: ["advertising", "video", "lighting"] },
  { id: "audiovisual", label: "Producción audiovisual", subtitle: "Video · Iluminación · Audio",             categories: ["video", "lighting", "audio"] },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

// ── Búsquedas populares (Fase 1: estáticas) ─────────────────────────────────

export const POPULAR_SEARCHES = [
  { label: "Sonido profesional",       q: "sonido profesional" },
  { label: "Pantallas LED",            q: "pantallas LED" },
  { label: "Iluminación para eventos", q: "iluminación eventos" },
  { label: "DJ y sonido para fiestas", q: "DJ sonido fiestas" },
  { label: "Generadores eléctricos",   q: "generador eléctrico" },
] as const;

// ── Tipo de datos de ciudad (Server → Client) ───────────────────────────────

export type CityInfo = {
  city: string;
  state: string;
  lat: number;
  lng: number;
  count: number;
  hasRecent: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Haversine distance in km between two lat/lng points */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Category labels (reusable) */
export const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido",
  lighting: "Iluminación",
  video: "Video",
  effects: "Efectos",
  advertising: "Publicidad",
  other: "Otro",
};
