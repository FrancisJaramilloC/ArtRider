"use client";

import dynamic from "next/dynamic";

// MapLibre GL necesita el objeto window, así que cargamos dinámicamente
const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-[55vh] md:h-full bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse [animation-delay:300ms]" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Cargando mapa...</p>
      </div>
    </div>
  ),
});

export default MapClient;
