"use client";

import { useState, useEffect } from "react";
import { useMap } from "@/components/ui/map";

/**
 * Hook que centra el mapa en la ubicación real del usuario al cargar.
 * Usa la API de geolocalización del navegador y `map.flyTo()`.
 * Se ejecuta una sola vez por ciclo de vida del componente.
 */
export function useFlyToUser() {
  const { map, isLoaded } = useMap();
  const [hasFlown, setHasFlown] = useState(false);

  useEffect(() => {
    if (!map || !isLoaded || hasFlown) return;
    if (!("geolocation" in navigator)) return;

    let isMounted = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isMounted) return;
        map.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1800,
        });
        setHasFlown(true);
      },
      () => {
        if (!isMounted) return;
        // Permiso denegado o error — se queda en el centro por defecto
        setHasFlown(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    return () => {
      isMounted = false;
    };
  }, [map, isLoaded, hasFlown]);
}
