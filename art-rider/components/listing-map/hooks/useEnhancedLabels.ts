"use client";

import { useState, useEffect } from "react";
import { useMap } from "@/components/ui/map";
import { ROAD_LABEL_CONFIG } from "../constants";

/**
 * Hook que mejora los labels de calles del estilo CARTO Dark Matter.
 *
 * - Autopistas/troncales: grandes y visibles desde zoom 10.
 * - Primarias: visibles desde zoom 12.
 * - Secundarias: aparecen al hacer zoom medio (14).
 * - Menores: solo al zoom profundo (15+).
 *
 * Lee la configuración declarativa desde `constants.ts` para que
 * cualquier ajuste sea un solo cambio de datos, no de lógica.
 */
export function useEnhancedLabels() {
  const { map, isLoaded } = useMap();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!map || !isLoaded || applied) return;

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const applyLabels = () => {
      if (!isMounted) return;
      try {
        for (const config of ROAD_LABEL_CONFIG) {
          if (!map.getLayer(config.layerId)) continue;

          // Text size interpolado por zoom
          map.setLayoutProperty(config.layerId, "text-size", [
            "interpolate",
            ["linear"],
            ["zoom"],
            ...config.textSize,
          ]);

          // Color y halo
          map.setPaintProperty(config.layerId, "text-color", config.textColor);
          map.setPaintProperty(config.layerId, "text-halo-width", config.haloWidth);

          // Letter-spacing (solo si se define)
          if ((config as any).letterSpacing) {
            map.setLayoutProperty(config.layerId, "text-letter-spacing", [
              "interpolate",
              ["linear"],
              ["zoom"],
              ...(config as any).letterSpacing,
            ]);
          }

          // Rango de zoom visible
          map.setLayerZoomRange(config.layerId, config.zoomRange[0], config.zoomRange[1]);
        }

        if (isMounted) setApplied(true);
      } catch {
        // Si el estilo aún no cargó completamente, se ignora
      }
    };

    const handleStyleData = () => {
      timer = setTimeout(applyLabels, 200);
    };

    if (map.isStyleLoaded()) {
      applyLabels();
    } else {
      map.once("styledata", handleStyleData);
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
      map.off("styledata", handleStyleData);
    };
  }, [map, isLoaded, applied]);
}
