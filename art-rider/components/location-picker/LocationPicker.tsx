"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

//  Tipos

export type LocationData = {
  lat: number;
  lng: number;
  city: string;
  state: string;
  displayAddress: string;
};

//  Tipo de resultado de Nominatim
type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    county?: string;
  };
};

//  Props del componente
type Props = {
  onChange: (location: LocationData) => void;
  defaultCenter?: [number, number]; // [lng, lat]
  //  Locación inicial (pre-sembrada desde un listing guardado — inicializa el mapa inmediatamente)
  initialLocation?: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  };
};

//  Constantes

const DEFAULT_CENTER: [number, number] = [-79.20422, -3.99313]; // Loja
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

//  Componente principal
export default function LocationPicker({ onChange, defaultCenter = DEFAULT_CENTER, initialLocation }: Props) {
  //  Estado de búsqueda
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  //  Estado del mapa
  const [mapReady, setMapReady] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  //  Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  //  Previene que el efecto de geocodificación directa se ejecute en cambios de consulta programáticos
  const userTypedRef = useRef(false);

  //  Inicializar el mapa

  const initMap = useCallback(
    (center: [number, number]) => {
      if (!mapContainerRef.current) return;

      //  Destruye el mapa anterior si existe
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      //  Crea un nuevo mapa
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: DARK_STYLE,
        center,
        zoom: 16,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });

      //  Agrega control de navegación
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

      map.on("load", () => setMapReady(true));

      //  Cuando el usuario termina de arrastrar, captura el nuevo centro
      map.on("moveend", () => {
        const c = map.getCenter();
        reverseGeocode(c.lat, c.lng);
      });

      mapRef.current = map;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Inicialización única desde el listado guardado (modo editar) ───────────────────────

  useEffect(() => {
    if (!initialLocation) return;
    const { lat, lng, city, state } = initialLocation;

    //  Inicializa el mapa inmediatamente — visible sin ninguna interacción del usuario
    initMap([lng, lat]);

    //  Rellena la barra de búsqueda con la ciudad + estado para que no esté vacía
    const hint = city && state ? `${city}, ${state}` : "";
    if (hint) {
      setQuery(hint);
      setCurrentAddress(hint);
    }

    //  Emite los datos de ubicación inmediatamente para que el formulario tenga valores válidos al cargar
    if (city && state) {
      onChange({ lat, lng, city, state, displayAddress: hint });
    }

    //  Emite los datos de ubicación inmediatamente para que el formulario tenga valores válidos al cargar
    reverseGeocode(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //  Nominatim: Forward Geocoding (Search)

  useEffect(() => {
    //  Omite la búsqueda cuando la consulta se estableció programáticamente (por ejemplo, inicialización desde el listado guardado)
    if (!userTypedRef.current) return;

    //  Si la consulta es menor a 3 caracteres, muestra los resultados
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    //  Limpia el debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    //  Busca las sugerencias
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        //  Parametros de búsqueda
        const params = new URLSearchParams({
          format: "json",
          q: query,
          countrycodes: "ec",
          limit: "5",
          addressdetails: "1",
        });
        const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
          headers: { "Accept-Language": "es" },
        });
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowResults(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  //  Nominatim: Reverse Geocoding (Map drag)

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        //  Parametros de búsqueda
        const params = new URLSearchParams({
          format: "json",
          lat: String(lat),
          lon: String(lng),
          addressdetails: "1",
        });
        const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
          headers: { "Accept-Language": "es" },
        });
        const data = await res.json();

        //  Extracción de datos
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          "Sin ciudad";
        const state = data.address?.state || "Sin estado";
        const displayAddress = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        //  Actualiza el estado
        setCurrentAddress(displayAddress);
        onChange({ lat, lng, city, state, displayAddress });
      } catch {
        //  Manejo de errores
        onChange({
          lat,
          lng,
          city: "Sin ciudad",
          state: "Sin estado",
          displayAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        });
      }
    },
    [onChange]
  );

  //  Selección de sugerencia

  // Cuando el usuario selecciona una sugerencia de la lista
  function handleSelect(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Actualiza el estado
    setQuery(result.display_name);
    setShowResults(false);
    setCurrentAddress(result.display_name);

    // Extracción de datos
    const city =
      result.address?.city ||
      result.address?.town ||
      result.address?.village ||
      "Sin ciudad";
    const state = result.address?.state || result.address?.county || "Sin estado";
    
    // Emite los datos de ubicación al componente padre
    onChange({ lat, lng, city, state, displayAddress: result.display_name });

    // Mueve el mapa al punto seleccionado
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 17, duration: 1200 });
    } else {
      initMap([lng, lat]);
    }
  }

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Renderizado del componente

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">
        Ubicación del equipo
      </label>

      {/* Input de búsqueda */}
      <div ref={searchContainerRef} className="relative">
        <div className="relative">
          {/* Icono de búsqueda */}
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>

          {/* Input de búsqueda */}
          <input
            type="text"
            value={query}
            onChange={(e) => { userTypedRef.current = true; setQuery(e.target.value); }}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Busca una dirección, lugar o zona..."
            className="block w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 py-3.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Sugerencias de búsqueda */}
        {showResults && (
          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 flex items-start gap-3"
              >
                {/* Icono de ubicación */}
                <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {/* Dirección de la ubicación */}
                <span className="text-base text-gray-700 leading-snug line-clamp-2">
                  {r.display_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dirección de la ubicación */}
      {(mapReady || currentAddress) && (
        <p className="text-sm text-gray-500 font-medium truncate px-1">
          📍 {currentAddress}
        </p>
      )}

      {/* Mapa con pin central fijo (CSS only - siempre centrado) */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 400 }}>
        <div ref={mapContainerRef} className="w-full h-full" />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center -mt-8">
            {/* Pin principal */}
            <div className="w-8 h-8 rounded-full bg-[#875B9A] border-[3px] border-white shadow-lg shadow-[#875B9A]/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            {/* Pin tail */}
            <div className="w-0.5 h-4 bg-[#875B9A]/60" />
            {/* Shadow dot */}
            <div className="w-3 h-1 rounded-full bg-black/20 mt-0.5" />
          </div>
        </div>

        {/* Pista overlay (cuando no se ha inicializado el mapa) */}
        {!mapRef.current && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center px-6">
              <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-sm text-gray-400 font-medium">Busca una dirección para mostrar el mapa</p>
              <p className="text-xs text-gray-300 mt-1">Podrás ajustar la ubicación exacta arrastrando</p>
            </div>
          </div>
        )}

        {/* Pista Drag para ajustar (después de que el mapa está listo) */}
        {mapReady && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
            Arrastra el mapa para ajustar
          </div>
        )}
      </div>
    </div>
  );
}
