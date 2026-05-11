"use client";

import { useFlyToUser } from "./useFlyToUser";
import { useEnhancedLabels } from "./useEnhancedLabels";

/**
 * Componente invisible que aplica los efectos del mapa al montarse:
 * - Centra el mapa en la ubicación del usuario (FlyToUser)
 * - Mejora los labels de calles (EnhancedLabels)
 *
 * Se monta dentro de <Map> para tener acceso al contexto useMap().
 */
export function MapEffects() {
  useFlyToUser();
  useEnhancedLabels();
  return null;
}
