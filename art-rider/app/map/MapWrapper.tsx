"use client";

import dynamic from "next/dynamic";

// Importamos el cliente de mapa dinámicamente, desactivando el Server-Side Rendering
// Esto es estrictamente necesario para react-leaflet porque usa el objeto "window"
const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-[50vh] md:h-full bg-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-300 animate-pulse" />
        <p className="text-gray-500 font-medium text-sm">Cargando mapa interactivo...</p>
      </div>
    </div>
  ),
});

export default MapClient;
