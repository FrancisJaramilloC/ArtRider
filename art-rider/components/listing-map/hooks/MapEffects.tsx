"use client";

import { useEnhancedLabels } from "./useEnhancedLabels";

/**
 * Componente invisible que aplica los efectos del mapa al montarse:
 * - Mejora los labels de calles (EnhancedLabels)
 *
 * Se monta dentro de <Map> para tener acceso al contexto useMap().
 */
export function MapEffects() {
  useEnhancedLabels();
  return null;
}
