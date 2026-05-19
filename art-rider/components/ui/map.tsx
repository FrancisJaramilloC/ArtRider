"use client";

import MapLibreGL, { type PopupOptions, type MarkerOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createContext,forwardRef,useCallback,useContext,useEffect,useId,useImperativeHandle,useMemo,useRef,useState,type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Maximize, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

//Estilos por defecto del mapa
const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

type Theme = "light" | "dark";

// Función que obtiene el tema del documento (funciona con next-themes, etc.)
function getDocumentTheme(): Theme | null {
  if (typeof document === "undefined") return null;
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return null;
}

// Obtiene la preferencia de tema del sistema
function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function useResolvedTheme(themeProp?: "light" | "dark"): Theme {
  const [detectedTheme, setDetectedTheme] = useState<Theme>(
    () => getDocumentTheme() ?? getSystemTheme(),
  );

  useEffect(() => {
    if (themeProp) return; // Skip detection if theme is provided via prop

    //  Observation de cambios en la clase del documento (ej. next-themes toggling dark class)
    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme();
      if (docTheme) {
        setDetectedTheme(docTheme);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // También observa los cambios en la preferencia de tema del sistema
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      // Solo usa la preferencia del sistema si no hay clase de documento establecida
      if (!getDocumentTheme()) {
        setDetectedTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, [themeProp]);

  return themeProp ?? detectedTheme;
}

// Estructura del contexto del mapa
type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
};

// Contexto del mapa
const MapContext = createContext<MapContextValue | null>(null);

// Hook para acceder al contexto del mapa
function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a Map component");
  }
  return context;
}

//  Estado de la vista del mapa 
type MapViewport = {
  // Coordenadas del centro [longitud, latitud]
  center: [number, number];
  // Nivel de zoom
  zoom: number;
  // Orientación (rotación) en grados
  bearing: number;
  // Inclinación en grados
  pitch: number;
};

// Opción de estilo del mapa
type MapStyleOption = string | MapLibreGL.StyleSpecification;

// Referencia al mapa
type MapRef = MapLibreGL.Map;

// Props del mapa
type MapProps = {
  children?: ReactNode;
  // Clases CSS adicionales para el contenedor del mapa
  className?: string;
  //  Tema para el mapa. Si no se proporciona, detecta automáticamente la preferencia del sistema.
  //  Pasa tu valor de tema aquí.
  theme?: Theme;
  //  Estilos personalizados del mapa para temas claros y oscuros. Anula los estilos predeterminados de Carto.
  styles?: {
    light?: MapStyleOption;
    dark?: MapStyleOption;
  };
  /** Tipo de proyección del mapa. Usa `{ type: "globe" }` para vista de globo 3D. */
  projection?: MapLibreGL.ProjectionSpecification;
  /**
   * Vista controlada. Cuando se proporciona con onViewportChange,
   * el mapa se vuelve controlado y la vista es impulsada por esta prop.
   */
  viewport?: Partial<MapViewport>;
  /**
   * Callback que se ejecuta continuamente a medida que la vista cambia (pan, zoom, rotate, pitch).
   * Se puede usar de forma independiente para observar cambios, o con la prop `viewport`
   * para habilitar el modo controlado donde la vista del mapa es impulsada por tu estado.
   */
  onViewportChange?: (viewport: MapViewport) => void;
  // Mostrar un indicador de carga en el mapa
  loading?: boolean;
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

//  Loader por defecto
function DefaultLoader() {
  return (
    <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
      <div className="flex gap-1">
        <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full" />
        <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
        <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
      </div>
    </div>
  );
}

//  Obtiene la vista actual del mapa
function getViewport(map: MapLibreGL.Map): MapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

//  Componente Map
const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    children,
    className,
    theme: themeProp,
    styles,
    projection,
    viewport,
    onViewportChange,
    loading = false,
    ...props
  },
  ref,
) {
  //  Referencias
  const containerRef = useRef<HTMLDivElement>(null);
  //  Estados
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const currentStyleRef = useRef<MapStyleOption | null>(null);
  const styleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalUpdateRef = useRef(false);
  const resolvedTheme = useResolvedTheme(themeProp);

  const isControlled = viewport !== undefined && onViewportChange !== undefined;

  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const mapStyles = useMemo(
    () => ({
      dark: styles?.dark ?? defaultStyles.dark,
      light: styles?.light ?? defaultStyles.light,
    }),
    [styles],
  );

  //  Exporta la instancia del mapa al componente padre
  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance]);

  //  Limpia el timeout de estilos
  const clearStyleTimeout = useCallback(() => {
    if (styleTimeoutRef.current) {
      clearTimeout(styleTimeoutRef.current);
      styleTimeoutRef.current = null;
    }
  }, []);

  //  Inicializa el mapa
  useEffect(() => {
    if (!containerRef.current) return;

    const initialStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    currentStyleRef.current = initialStyle;

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: initialStyle,
      renderWorldCopies: false,
      attributionControl: {
        compact: true,
      },
      ...props,
      ...viewport,
    });

    const styleDataHandler = () => {
      clearStyleTimeout();
      //  Retrasa para asegurar que el estilo se procese completamente antes de permitir operaciones de capa
      //  Esto es una solución para evitar condiciones de carrera con la carga de estilos
      //  De lo contrario, tenemos que actualizar forzosamente cada capa en setStyle change
      styleTimeoutRef.current = setTimeout(() => {
        setIsStyleLoaded(true);
        if (projection) {
          map.setProjection(projection);
        }
      }, 100);
    };
    const loadHandler = () => setIsLoaded(true);

    //  Manejador de cambios de vista - saltar si es provocado por una actualización interna
    const handleMove = () => {
      if (internalUpdateRef.current) return;
      onViewportChangeRef.current?.(getViewport(map));
    };

    //  Maneja los eventos del mapa
    map.on("load", loadHandler);
    map.on("styledata", styleDataHandler);
    map.on("move", handleMove);
    setMapInstance(map);

    //  Limpia el mapa cuando el componente se desmonta
    return () => {
      clearStyleTimeout();
      map.off("load", loadHandler);
      map.off("styledata", styleDataHandler);
      map.off("move", handleMove);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //  Sincroniza la vista controlada con el mapa
  useEffect(() => {
    if (!mapInstance || !isControlled || !viewport) return;
    if (mapInstance.isMoving()) return;

    //  Obtiene la vista actual y la compara con la vista controlada
    const current = getViewport(mapInstance);
    const next = {
      center: viewport.center ?? current.center,
      zoom: viewport.zoom ?? current.zoom,
      bearing: viewport.bearing ?? current.bearing,
      pitch: viewport.pitch ?? current.pitch,
    };

    //  Compara la vista actual con la vista controlada
    if (
      next.center[0] === current.center[0] &&
      next.center[1] === current.center[1] &&
      next.zoom === current.zoom &&
      next.bearing === current.bearing &&
      next.pitch === current.pitch
    ) {
      return;
    }

    internalUpdateRef.current = true;
    mapInstance.jumpTo(next);
    internalUpdateRef.current = false;
  }, [mapInstance, isControlled, viewport]);

  //  Maneja los cambios de estilo
  useEffect(() => {
    if (!mapInstance || !resolvedTheme) return; // Si no hay mapa o no hay tema, no hacer nada

    const newStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light; // Si el tema es oscuro, usa el estilo oscuro, si no, usa el estilo claro

    //  Compara el estilo actual con el nuevo estilo
    if (currentStyleRef.current === newStyle) return; // Si el estilo actual es igual al nuevo estilo, no hacer nada

    clearStyleTimeout(); // Limpia el timeout de estilos
    currentStyleRef.current = newStyle; // Actualiza el estilo actual
    setIsStyleLoaded(false); // Desactiva el indicador de estilo cargado

    mapInstance.setStyle(newStyle, { diff: true }); // Establece el nuevo estilo
  }, [mapInstance, resolvedTheme, mapStyles, clearStyleTimeout]); // Dependencias del efecto

  //  Crea el valor del contexto
  const contextValue = useMemo(
    () => ({
      map: mapInstance,
      isLoaded: isLoaded && isStyleLoaded,
    }),
    [mapInstance, isLoaded, isStyleLoaded], // Dependencias del contexto
  );

  //  Renderiza el mapa
  return (
    <MapContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={cn("relative h-full w-full", className)}
      >
        {/*  Muestra un loader mientras se carga el mapa */}
        {(!isLoaded || loading) && <DefaultLoader />}
        {/*  Renderiza los hijos solo cuando el mapa está cargado en el cliente */}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

//  Contexto para los componentes de marcadores
type MarkerContextValue = {
  marker: MapLibreGL.Marker;
  map: MapLibreGL.Map | null;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

//  Hook para obtener el contexto del marcador
function useMarkerContext() {
  const context = useContext(MarkerContext);
  //  Si no hay contexto, lanza un error
  if (!context) {
    throw new Error("Marker components must be used within MapMarker");
  }
  return context;
}

type MapMarkerProps = {
  /** Coordenada de longitud para la posición del marcador */
  longitude: number;
  /** Coordenada de latitud para la posición del marcador */
  latitude: number;
  /** Subcomponentes del marcador (MarkerContent, MarkerPopup, MarkerTooltip, MarkerLabel) */
  children: ReactNode;
  /** Callback cuando el marcador es clickeado */
  onClick?: (e: MouseEvent) => void;
  /** Callback cuando el mouse entra en el marcador */
  onMouseEnter?: (e: MouseEvent) => void;
  /** Callback cuando el mouse sale del marcador */
  onMouseLeave?: (e: MouseEvent) => void;
  /** Callback cuando el drag del marcador comienza (requiere draggable: true) */
  onDragStart?: (lngLat: { lng: number; lat: number }) => void;
  /** Callback durante el drag del marcador (requiere draggable: true) */
  onDrag?: (lngLat: { lng: number; lat: number }) => void;
  /** Callback cuando el drag del marcador termina (requiere draggable: true) */
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

//  Renderiza un marcador en el mapa
function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrag,
  onDragEnd,
  draggable = false,
  ...markerOptions
}: MapMarkerProps) {
  //  Obtiene el mapa del contexto
  const { map } = useMap();

  //  Crea una referencia a los callbacks
  const callbacksRef = useRef({
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  });
  callbacksRef.current = {
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  };

  //  Crea el marcador
  const marker = useMemo(() => {
    const markerInstance = new MapLibreGL.Marker({
      ...markerOptions,
      element: document.createElement("div"),
      draggable,
    }).setLngLat([longitude, latitude]);

    const handleClick = (e: MouseEvent) => callbacksRef.current.onClick?.(e);
    const handleMouseEnter = (e: MouseEvent) =>
      callbacksRef.current.onMouseEnter?.(e);
    const handleMouseLeave = (e: MouseEvent) =>
      callbacksRef.current.onMouseLeave?.(e);

    //  Agrega los event listeners al marcador
    markerInstance.getElement()?.addEventListener("click", handleClick);
    markerInstance
      .getElement()
      ?.addEventListener("mouseenter", handleMouseEnter);
    markerInstance
      .getElement()
      ?.addEventListener("mouseleave", handleMouseLeave);

    //  Maneja el drag del marcador
    const handleDragStart = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDrag = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDragEnd = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    };

    //  Agrega los event listeners al marcador
    markerInstance.on("dragstart", handleDragStart);
    markerInstance.on("drag", handleDrag);
    markerInstance.on("dragend", handleDragEnd);

    return markerInstance;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //  Agrega el marcador al mapa
  useEffect(() => {
    if (!map) return;

    marker.addTo(map);

    //  Elimina el marcador cuando el componente se desmonta
    return () => {
      marker.remove();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  //  Actualiza la posición del marcador si cambia
  if (
    marker.getLngLat().lng !== longitude ||
    marker.getLngLat().lat !== latitude
  ) {
    marker.setLngLat([longitude, latitude]);
  }
  if (marker.isDraggable() !== draggable) {
    marker.setDraggable(draggable);
  }

  //  Actualiza el offset del marcador
  const currentOffset = marker.getOffset();
  const newOffset = markerOptions.offset ?? [0, 0];
  const [newOffsetX, newOffsetY] = Array.isArray(newOffset)
    ? newOffset
    : [newOffset.x, newOffset.y];
  if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) {
    marker.setOffset(newOffset);
  }

  //  Actualiza la rotación del marcador
  if (marker.getRotation() !== markerOptions.rotation) {
    marker.setRotation(markerOptions.rotation ?? 0);
  }
  //  Actualiza la alineación de rotación del marcador
  if (marker.getRotationAlignment() !== markerOptions.rotationAlignment) {
    marker.setRotationAlignment(markerOptions.rotationAlignment ?? "auto");
  }
  //  Actualiza la alineación de pitch del marcador
  if (marker.getPitchAlignment() !== markerOptions.pitchAlignment) {
    marker.setPitchAlignment(markerOptions.pitchAlignment ?? "auto");
  }

  //  Renderiza el marcador
  return (
    <MarkerContext.Provider value={{ marker, map }}>
      {children}
    </MarkerContext.Provider>
  );
}

//  Props para el contenido del marcador
type MarkerContentProps = {
  /** Contenido personalizado del marcador. Por defecto es un punto azul */
  children?: ReactNode;
  /** Clases CSS adicionales para el contenedor del marcador */
  className?: string;
};

//  Renderiza el contenido del marcador
function MarkerContent({ children, className }: MarkerContentProps) {
  const { marker } = useMarkerContext();

  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children || <DefaultMarkerIcon />}
    </div>,
    marker.getElement(),
  );
}

//  Renderiza un ícono de marcador predeterminado (punto azul)
function DefaultMarkerIcon() {
  return (
    <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
  );
}

//  Botón de cierre para el popup
function PopupCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close popup"
      className="focus-visible:ring-ring hover:bg-muted text-foreground absolute top-0.5 right-0.5 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors focus:outline-none focus-visible:ring-2"
    >
      <X className="size-3.5" />
    </button>
  );
}

//  Props para el popup del marcador
type MarkerPopupProps = {
  /** Contenido del popup */
  children: ReactNode;
  /** Clases CSS adicionales para el contenedor del popup */
  className?: string;
  /** Mostrar un botón de cierre en el popup (por defecto: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

//  Renderiza el popup del marcador
function MarkerPopup({
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MarkerPopupProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const prevPopupOptions = useRef(popupOptions);

  //  Crea el popup
  const popup = useMemo(() => {
    const popupInstance = new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setDOMContent(container);

    return popupInstance;
  }, []);

  //  Agrega el popup al mapa
  useEffect(() => {
    if (!map) return;

    popup.setDOMContent(container);
    marker.setPopup(popup);

    //  Elimina el popup cuando el componente se desmonta
    return () => {
      marker.setPopup(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  //  Actualiza el popup si los props cambian
  if (popup.isOpen()) {
    const prev = prevPopupOptions.current;

    //  Actualiza el offset del popup
    if (prev.offset !== popupOptions.offset) {
      popup.setOffset(popupOptions.offset ?? 16);
    }

    //  Actualiza el max-width del popup
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      popup.setMaxWidth(popupOptions.maxWidth ?? "none");
    }

    //  Actualiza los props del popup
    prevPopupOptions.current = popupOptions;
  }

  //  Cierra el popup
  const handleClose = () => popup.remove();

  //  Renderiza el popup
  return createPortal(
    <div
      className={cn(
        "bg-popover text-popover-foreground relative max-w-62 rounded-md border p-3 shadow-md",
        "animate-in fade-in-0 zoom-in-95 duration-200 ease-out",
        className,
      )}
    >
      {/* Botón de cierre */}
      {closeButton && <PopupCloseButton onClick={handleClose} />}
      {/* Contenido */}
      {children}
    </div>,
    container,
  );
}

//  Props para el tooltip del marcador
type MarkerTooltipProps = {
  /** Contenido del tooltip */
  children: ReactNode;
  /** Clases CSS adicionales para el contenedor del tooltip */
  className?: string;
} & Omit<PopupOptions, "className" | "closeButton" | "closeOnClick">;

//  Renderiza el tooltip del marcador
function MarkerTooltip({
  children,
  className,
  ...popupOptions
}: MarkerTooltipProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const prevTooltipOptions = useRef(popupOptions);

  //  Crea el tooltip
  const tooltip = useMemo(() => {
    const tooltipInstance = new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeOnClick: true,
      closeButton: false,
    }).setMaxWidth("none");

    return tooltipInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //  Agrega el tooltip al mapa
  useEffect(() => {
    if (!map) return;

    tooltip.setDOMContent(container);

    //  Maneja el evento mouseenter
    const handleMouseEnter = () => {
      tooltip.setLngLat(marker.getLngLat()).addTo(map);
    };

    //  Maneja el evento mouseleave
    const handleMouseLeave = () => tooltip.remove();

    //  Agrega los event listeners
    marker.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    marker.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    //  Elimina los event listeners cuando el componente se desmonta
    return () => {
      marker.getElement()?.removeEventListener("mouseenter", handleMouseEnter);
      marker.getElement()?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  //  Actualiza el tooltip si los props cambian
  if (tooltip.isOpen()) {
    const prev = prevTooltipOptions.current;

    //  Actualiza el offset del tooltip
    if (prev.offset !== popupOptions.offset) {
      tooltip.setOffset(popupOptions.offset ?? 16);
    }

    //  Actualiza el max-width del tooltip
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      tooltip.setMaxWidth(popupOptions.maxWidth ?? "none");
    }

    //  Actualiza los props del tooltip
    prevTooltipOptions.current = popupOptions;
  }

  //  Renderiza el tooltip
  return createPortal(
    <div
      className={cn(
        "bg-foreground text-background pointer-events-none rounded-md px-2 py-1 text-xs text-balance shadow-md",
        "animate-in fade-in-0 zoom-in-95 duration-200 ease-out",
        className,
      )}
    >
      {children}
    </div>,
    container,
  );
}

//  Props para la etiqueta del marcador
type MarkerLabelProps = {
  /** Texto de la etiqueta */
  children: ReactNode;
  /** Clases CSS adicionales para la etiqueta */
  className?: string;
  /** Posición de la etiqueta relativa al marcador (por defecto: "top") */
  position?: "top" | "bottom";
};

function MarkerLabel({
  children,
  className,
  position = "top",
}: MarkerLabelProps) {
  const positionClasses = {
    top: "bottom-full mb-1",
    bottom: "top-full mt-1",
  };

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 whitespace-nowrap",
        "text-foreground text-[10px] font-medium",
        positionClasses[position],
        className,
      )}
    >
      {children}
    </div>
  );
}

//  Props para los controles del mapa
type MapControlsProps = {
  /** Posición de los controles en el mapa (por defecto: "bottom-right") */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Mostrar botones de zoom (por defecto: true) */
  showZoom?: boolean;
  /** Mostrar botón de brújula para resetear el rumbo (por defecto: false) */
  showCompass?: boolean;
  /** Mostrar botón de ubicación para encontrar la ubicación del usuario (por defecto: false) */
  showLocate?: boolean;
  /** Mostrar botón de pantalla completa para alternar (por defecto: false) */
  showFullscreen?: boolean;
  /** Clases CSS adicionales para el contenedor de controles */
  className?: string;
  /** Callback con las coordenadas del usuario cuando se ubica */
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
};

//  Posición de los controles en el mapa
const positionClasses = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-10 right-2",
};

//  Grupo de controles
function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-background [&>button:not(:last-child)]:border-border flex flex-col overflow-hidden rounded-md border shadow-sm [&>button:not(:last-child)]:border-b">
      {children}
    </div>
  );
}

//  Botón de control
function ControlButton({
  onClick,
  label,
  children,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      type="button"
      className={cn(
        "flex size-8 items-center justify-center transition-all",
        "first:rounded-t-md last:rounded-b-md",
        "hover:bg-accent dark:hover:bg-accent/40",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

//  Renderiza los controles del mapa
function MapControls({
  position = "bottom-right",
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { map } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);

  //  Zoom in
  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  }, [map]);

  //  Zoom out
  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 });
  }, [map]);

  //  Resetea el rumbo
  const handleResetBearing = useCallback(() => {
    map?.resetNorthPitch({ duration: 300 });
  }, [map]);

  //  Ubica al usuario
  const handleLocate = useCallback(() => {
    setWaitingForLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
          };
          map?.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: 14,
            duration: 1500,
          });
          onLocate?.(coords);
          setWaitingForLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setWaitingForLocation(false);
        },
      );
    }
  }, [map, onLocate]);

  //  Alterna pantalla completa
  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [map]);

  //  Renderiza los controles
  return (
    <div
      className={cn(
        "absolute z-10 flex flex-col gap-1.5",
        positionClasses[position],
        className,
      )}
    >
      {/* Botones de zoom */}
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Zoom in">
            <Plus className="size-4" />
          </ControlButton>
          <ControlButton onClick={handleZoomOut} label="Zoom out">
            <Minus className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
      {/* Botón de brújula */}
      {showCompass && (
        <ControlGroup>
          <CompassButton onClick={handleResetBearing} />
        </ControlGroup>
      )}
      {/* Botón de ubicación */}
      {showLocate && (
        <ControlGroup>
          <ControlButton
            onClick={handleLocate}
            label="Find my location"
            disabled={waitingForLocation}
          >
            {waitingForLocation ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Locate className="size-4" />
            )}
          </ControlButton>
        </ControlGroup>
      )}
      {/* Botón de pantalla completa */}
      {showFullscreen && (
        <ControlGroup>
          <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
            <Maximize className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
    </div>
  );
}

//  Botón de brújula
function CompassButton({ onClick }: { onClick: () => void }) {
  const { map } = useMap();
  const compassRef = useRef<SVGSVGElement>(null);

  //  Actualiza la rotación del botón de brújula
  useEffect(() => {
    if (!map || !compassRef.current) return;

    const compass = compassRef.current;

    //  Actualiza la rotación del botón de brújula
    const updateRotation = () => {
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      compass.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
    };
    
    map.on("rotate", updateRotation);
    map.on("pitch", updateRotation);
    updateRotation();

    return () => {
      map.off("rotate", updateRotation);
      map.off("pitch", updateRotation);
    };
  }, [map]);

  return (
    <ControlButton onClick={onClick} label="Reset bearing to north">
      <svg
        ref={compassRef}
        viewBox="0 0 24 24"
        className="size-5 transition-transform duration-200"
        style={{ transformStyle: "preserve-3d" }}
      >
        <path d="M12 2L16 12H12V2Z" className="fill-red-500" />
        <path d="M12 2L8 12H12V2Z" className="fill-red-300" />
        <path d="M12 22L16 12H12V22Z" className="fill-muted-foreground/60" />
        <path d="M12 22L8 12H12V22Z" className="fill-muted-foreground/30" />
      </svg>
    </ControlButton>
  );
}

//  Props para el popup del mapa
type MapPopupProps = {
  /** Coordenada de longitud para la posición del popup */
  longitude: number;
  /** Coordenada de latitud para la posición del popup */
  latitude: number;
  /** Callback when popup is closed */
  onClose?: () => void;
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

//  Renderiza el popup del mapa
function MapPopup({
  longitude,
  latitude,
  onClose,
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MapPopupProps) {
  const { map } = useMap();
  const popupOptionsRef = useRef(popupOptions);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const container = useMemo(() => document.createElement("div"), []);

  //  Popup del mapa
  const popup = useMemo(() => {
    const popupInstance = new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setLngLat([longitude, latitude]);

    return popupInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //  Actualiza el popup cuando las props cambian
  useEffect(() => {
    if (!map) return;

    // Callback para cuando el popup se cierra
    const onCloseProp = () => onCloseRef.current?.();

    popup.on("close", onCloseProp);

    popup.setDOMContent(container);
    popup.addTo(map);

    return () => {
      popup.off("close", onCloseProp);
      if (popup.isOpen()) {
        popup.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  //  Actualiza el popup cuando las props cambian
  if (popup.isOpen()) {
    const prev = popupOptionsRef.current;

    //  Actualiza la posición del popup
    if (
      popup.getLngLat().lng !== longitude ||
      popup.getLngLat().lat !== latitude
    ) {
      popup.setLngLat([longitude, latitude]);
    }
    
    //  Actualiza el offset del popup
    if (prev.offset !== popupOptions.offset) {
      popup.setOffset(popupOptions.offset ?? 16);
    }
    //  Actualiza el ancho máximo del popup
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      popup.setMaxWidth(popupOptions.maxWidth ?? "none");
    }
    popupOptionsRef.current = popupOptions;
  }

  //  Cierra el popup
  const handleClose = () => {
    popup.remove();
  };

  return createPortal(
    <div
      className={cn(
        "bg-popover text-popover-foreground relative max-w-62 rounded-md border p-3 shadow-md",
        "animate-in fade-in-0 zoom-in-95 duration-200 ease-out",
        className,
      )}
    >
      {closeButton && <PopupCloseButton onClick={handleClose} />}
      {children}
    </div>,
    container,
  );
}

//  Props para la ruta del mapa
type MapRouteProps = {
  /** Identificador único para la capa de la ruta */
  id?: string;
  /** Array de pares de coordenadas [longitud, latitud] que definen la ruta */
  coordinates: [number, number][];
  /** Color de la línea como valor CSS (por defecto: "#4285F4") */
  color?: string;
  /** Ancho de la línea en píxeles (por defecto: 3) */
  width?: number;
  /** Opacidad de la línea de 0 a 1 (por defecto: 0.8) */
  opacity?: number;
  /** Patrón de guiones [longitud del guion, longitud del espacio] para líneas discontinuas */
  dashArray?: [number, number];
  /** Callback cuando se hace clic en la línea de la ruta */
  onClick?: () => void;
  /** Callback cuando el mouse entra en la línea de la ruta */
  onMouseEnter?: () => void;
  /** Callback cuando el mouse sale de la línea de la ruta */
  onMouseLeave?: () => void;
  /** Si la ruta es interactiva - muestra el cursor de puntero al pasar el mouse (por defecto: true) */
  interactive?: boolean;
};

//  Renderiza la ruta del mapa
function MapRoute({
  id: propId,
  coordinates,
  color = "#4285F4",
  width = 3,
  opacity = 0.8,
  dashArray,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive = true,
}: MapRouteProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  //  Añade la fuente y la capa al montar
  useEffect(() => {
    if (!isLoaded || !map) return;

    //  Añade la fuente de datos GeoJSON
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    });

    //  Añade la capa de la línea
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": width,
        "line-opacity": opacity,
        ...(dashArray && { "line-dasharray": dashArray }),
      },
    });

    //  Elimina la fuente y la capa al desmontar
    return () => {
      try {
        //  Elimina la capa de la línea
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        //  Elimina la fuente de datos
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        //  Ignora los errores
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  //  Actualiza los datos de la fuente cuando las coordenadas cambian
  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) return;

    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      });
    }
  }, [isLoaded, map, coordinates, sourceId]);

  //  Actualiza la capa de la línea cuando las propiedades cambian
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;

    //  Actualiza el color de la línea
    map.setPaintProperty(layerId, "line-color", color);
    //  Actualiza el ancho de la línea
    map.setPaintProperty(layerId, "line-width", width);
    map.setPaintProperty(layerId, "line-opacity", opacity);
    //  Actualiza el patrón de guiones de la línea
    if (dashArray) {
      map.setPaintProperty(layerId, "line-dasharray", dashArray);
    }
  }, [isLoaded, map, layerId, color, width, opacity, dashArray]);

  //  Maneja los eventos de clic y hover
  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;
    
    //  Callback para cuando se hace clic en la línea
    const handleClick = () => {
      onClick?.();
    };
    //  Callback para cuando el mouse entra en la línea
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
      onMouseEnter?.();
    };
    //  Callback para cuando el mouse sale de la línea
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      onMouseLeave?.();
    };

    //  Añade los eventos de clic y hover
    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleMouseEnter);
    map.on("mouseleave", layerId, handleMouseLeave);

    //  Elimina los eventos de clic y hover
    return () => {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleMouseEnter);
      map.off("mouseleave", layerId, handleMouseLeave);
    };
  }, [
    isLoaded,
    map,
    layerId,
    onClick,
    onMouseEnter,
    onMouseLeave,
    interactive,
  ]);

  return null;
}

//  Props para el arco del mapa
type MapArcDatum = {
  /** Identificador único para el arco. Requerido para el seguimiento del estado de hover y las cargas útiles de eventos. */
  id: string | number;
  /** Coordenada inicial como [longitud, latitud]. */
  from: [number, number];
  /** Coordenada final como [longitud, latitud]. */
  to: [number, number];
};

//  Payload de eventos pasado a los callbacks de interacción de MapArc
type MapArcEvent<T extends MapArcDatum = MapArcDatum> = {
  /** El arco que se ha pasado el mouse o se ha hecho clic en él. */
  arc: T;
  /** Longitud de la posición del cursor en el momento del evento. */
  longitude: number;
  /** Latitud de la posición del cursor en el momento del evento. */
  latitude: number;
  /** El evento de mouse subyacente de MapLibre para casos de uso avanzados. */
  originalEvent: MapLibreGL.MapMouseEvent;
};

type MapArcLinePaint = NonNullable<MapLibreGL.LineLayerSpecification["paint"]>;
type MapArcLineLayout = NonNullable<
  MapLibreGL.LineLayerSpecification["layout"]
>;

//  Props para el arco del mapa
type MapArcProps<T extends MapArcDatum = MapArcDatum> = {
  /** Array de arcos para renderizar. Cada arco debe tener un `id` único. */
  data: T[];
  /** Prefijo de identificador único opcional para la fuente/capas del arco. Se genera automáticamente si no se proporciona. */
  id?: string;
  /**
   * Qué tan lejos se desvía cada arco de una línea recta. `0` renderiza líneas rectas
   * lines; higher values bend further. Negative values bend to the opposite`
   * side. Arcs are computed as a quadratic Bézier in lng/lat space and do not
   * account for the antimeridian. (default: 0.2)
   */
  curvature?: number;
  /** Número de muestras utilizadas para renderizar cada curva. Mayor = más suave. (por defecto: 64) */
  samples?: number;
  /**
   * Propiedades de pintura de MapLibre para la capa de arco. Fusionadas encima de
   * valores predeterminados sensatos (`line-color: #4285F4`, `line-width: 2`, `line-opacity: 0.85`).
   * Cualquier valor puede ser una expresión de MapLibre para el estilo por característica,
   * cada campo en cada dato de arco (además de `from`/`to`) se expone a través de `["get", ...]`.
   */
  paint?: MapArcLinePaint;
  /** Propiedades de diseño de MapLibre para la capa de arco. Por defecto se acumulan con uniones/tapas redondeadas. */
  layout?: MapArcLineLayout;
  /**
   * Propiedades de pintura aplicadas al arco que se encuentra actualmente debajo del cursor. Cada clave
   * se fusiona en `paint` como una expresión `case` con clave en el estado de hover por característica,
   * de modo que solo el arco con el mouse cambia de apariencia.
   */
  hoverPaint?: MapArcLinePaint;
  /** Callback when an arc is clicked. */
  onClick?: (e: MapArcEvent<T>) => void;
  /**
   * Callback fired when the hovered arc changes. Receives the cursor's
   * lng/lat at the moment of entry, and `null` when the cursor leaves the
   * last hovered arc.
   */
  onHover?: (e: MapArcEvent<T> | null) => void;
  /** Whether arcs respond to mouse events (default: true). */
  interactive?: boolean;
  /** Optional MapLibre layer id to insert the arc layers before (z-order control). */
  beforeId?: string;
};

//  Valores por defecto para el arco del mapa
const DEFAULT_ARC_CURVATURE = 0.2;
const DEFAULT_ARC_SAMPLES = 64;
const ARC_HIT_MIN_WIDTH = 12;
const ARC_HIT_PADDING = 6;

//  Valores por defecto para la pintura del arco del mapa
const DEFAULT_ARC_PAINT: MapArcLinePaint = {
  "line-color": "#4285F4",
  "line-width": 2,
  "line-opacity": 0.85,
};

//  Valores por defecto para el diseño del arco del mapa
const DEFAULT_ARC_LAYOUT: MapArcLineLayout = {
  "line-join": "round",
  "line-cap": "round",
};

//  Función que fusiona la pintura del arco del mapa
function mergeArcPaint(
  paint: MapArcLinePaint,
  hoverPaint: MapArcLinePaint | undefined,
): MapArcLinePaint {
  if (!hoverPaint) return paint; // Si no hay pintura de hover, retorna la pintura original
  const merged: Record<string, unknown> = { ...paint }; // Copia la pintura original
  for (const [key, hoverValue] of Object.entries(hoverPaint)) {
    if (hoverValue === undefined) continue;
    const baseValue = merged[key]; // Valor base
    merged[key] =
      baseValue === undefined
        ? hoverValue // Si no hay valor base, usa el valor de hover
        : [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            hoverValue,
            baseValue,
          ];
  }
  return merged as MapArcLinePaint;
}

//  Función que construye las coordenadas del arco del mapa
function buildArcCoordinates(
  from: [number, number],
  to: [number, number],
  curvature: number,
  samples: number,
): [number, number][] {
  const [x0, y0] = from;
  const [x2, y2] = to;
  const dx = x2 - x0;
  const dy = y2 - y0;
  const distance = Math.hypot(dx, dy);

  // Si la distancia es 0 o la curvatura es 0, retorna una línea recta
  if (distance === 0 || curvature === 0) return [from, to];

  // Calcula el punto medio y la normal para calcular la curvatura
  const mx = (x0 + x2) / 2;
  const my = (y0 + y2) / 2;
  const nx = -dy / distance;
  const ny = dx / distance;
  const offset = distance * curvature;
  const cx = mx + nx * offset; // Centro del arco
  const cy = my + ny * offset; // Centro del arco

  // Genera puntos para el arco usando una curva de Bézier cuadrática
  const points: [number, number][] = [];
  const segments = Math.max(2, Math.floor(samples)); // Número de segmentos
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments; // Factor de interpolación
    const inv = 1 - t;
    const x = inv * inv * x0 + 2 * inv * t * cx + t * t * x2;
    const y = inv * inv * y0 + 2 * inv * t * cy + t * t * y2;
    points.push([x, y]);
  }
  return points;
}

//  Componente principal que renderiza los arcos del mapa
function MapArc<T extends MapArcDatum = MapArcDatum>({
  data,
  id: propId,
  curvature = DEFAULT_ARC_CURVATURE,
  samples = DEFAULT_ARC_SAMPLES,
  paint,
  layout,
  hoverPaint,
  onClick,
  onHover,
  interactive = true,
  beforeId,
}: MapArcProps<T>) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `arc-source-${id}`;
  const layerId = `arc-layer-${id}`;
  const hitLayerId = `arc-hit-layer-${id}`;

  // Combina la pintura por defecto con la pintura personalizada
  const mergedPaint = useMemo(
    () => mergeArcPaint({ ...DEFAULT_ARC_PAINT, ...paint }, hoverPaint),
    [paint, hoverPaint],
  );

  // Combina el diseño por defecto con el diseño personalizado
  const mergedLayout = useMemo(
    () => ({ ...DEFAULT_ARC_LAYOUT, ...layout }),
    [layout],
  );

  // Calcula el ancho del hit detection basado en el ancho de la línea
  const hitWidth = useMemo(() => {
    const w = paint?.["line-width"] ?? DEFAULT_ARC_PAINT["line-width"];
    const base = typeof w === "number" ? w : ARC_HIT_MIN_WIDTH;
    return Math.max(base + ARC_HIT_PADDING, ARC_HIT_MIN_WIDTH);
  }, [paint]);

  // Crea una colección de GeoJSON con los arcos
  const geoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(
    () => ({
      type: "FeatureCollection",
      features: data.map((arc) => {
        const { from, to, ...properties } = arc;
        return {
          type: "Feature",
          properties,
          geometry: {
            type: "LineString",
            coordinates: buildArcCoordinates(from, to, curvature, samples),
          },
        };
      }),
    }),
    [data, curvature, samples],
  );

  const latestRef = useRef({ data, onClick, onHover });
  latestRef.current = { data, onClick, onHover };

  // Agrega la fuente y las capas al montar el componente
  useEffect(() => {
    if (!isLoaded || !map) return;

    // Agrega la fuente GeoJSON
    map.addSource(sourceId, {
      type: "geojson",
      data: geoJSON,
      promoteId: "id",
    });

    // Agrega la capa de hit detection
    map.addLayer(
      {
        id: hitLayerId,
        type: "line",
        source: sourceId,
        layout: DEFAULT_ARC_LAYOUT,
        paint: {
          "line-color": "rgba(0, 0, 0, 0)",
          "line-width": hitWidth,
          "line-opacity": 1,
        },
      },
      beforeId,
    );

    // Agrega la capa del arco
    map.addLayer(
      {
        id: layerId,
        type: "line",
        source: sourceId,
        layout: mergedLayout,
        paint: mergedPaint,
      },
      beforeId,
    );

    // Remueve la fuente y las capas al desmontar el componente
    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // Sincroniza las características cuando cambian los datos, la curvatura o las muestras
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as
      | MapLibreGL.GeoJSONSource
      | undefined;
    source?.setData(geoJSON);
  }, [isLoaded, map, geoJSON, sourceId]);

  // Sincroniza la pintura y el diseño cuando cambian
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;

    // Sincroniza la pintura
    for (const [key, value] of Object.entries(mergedPaint)) {
      map.setPaintProperty(
        layerId,
        key as keyof MapArcLinePaint,
        value as never,
      );
    }
    // Sincroniza el diseño
    for (const [key, value] of Object.entries(mergedLayout)) {
      map.setLayoutProperty(
        layerId,
        key as keyof MapArcLineLayout,
        value as never,
      );
    }
    // Sincroniza el ancho del hit detection
    if (map.getLayer(hitLayerId)) {
      map.setPaintProperty(hitLayerId, "line-width", hitWidth);
    }
  }, [isLoaded, map, layerId, hitLayerId, mergedPaint, mergedLayout, hitWidth]);

  // Manejadores de interacción
  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;

    // ID del arco que está siendo hovereado
    let hoveredId: string | number | null = null;

    // Establece el estado de hover
    const setHover = (next: string | number | null) => {
      if (next === hoveredId) return;
      const sourceExists = !!map.getSource(sourceId);
      if (hoveredId != null && sourceExists) {
        map.setFeatureState(
          { source: sourceId, id: hoveredId },
          { hover: false },
        );
      }
      hoveredId = next;
      if (next != null && sourceExists) {
        map.setFeatureState({ source: sourceId, id: next }, { hover: true });
      }
    };

    // Encuentra el arco por su ID
    const findArc = (featureId: string | number | undefined) =>
      featureId == null
        ? undefined
        : latestRef.current.data.find(
            (arc) => String(arc.id) === String(featureId),
          );

    // Maneja el movimiento del mouse
    const handleMouseMove = (e: MapLibreGL.MapLayerMouseEvent) => {
      const featureId = e.features?.[0]?.id as string | number | undefined;
      if (featureId == null || featureId === hoveredId) return; // No hacer nada si no hay featureId o si es el mismo que ya está hovereado

      setHover(featureId);
      map.getCanvas().style.cursor = "pointer";

      // Encuentra el arco y llama al callback onHover
      const arc = findArc(featureId);
      if (arc) {
        latestRef.current.onHover?.({
          arc: arc as T,
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
          originalEvent: e,
        });
      }
    };

    // Maneja el mouse leaving
    const handleMouseLeave = () => {
      setHover(null);
      map.getCanvas().style.cursor = "";
      latestRef.current.onHover?.(null);
    };

    // Maneja el click en el arco
    const handleClick = (e: MapLibreGL.MapLayerMouseEvent) => {
      const arc = findArc(e.features?.[0]?.id as string | number | undefined);
      if (!arc) return;
      latestRef.current.onClick?.({
        arc: arc as T,
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        originalEvent: e,
      });
    };

    // Agrega los event listeners
    map.on("mousemove", hitLayerId, handleMouseMove);
    map.on("mouseleave", hitLayerId, handleMouseLeave);
    map.on("click", hitLayerId, handleClick);

    // Remueve los event listeners al desmontar
    return () => {
      map.off("mousemove", hitLayerId, handleMouseMove);
      map.off("mouseleave", hitLayerId, handleMouseLeave);
      map.off("click", hitLayerId, handleClick);
      setHover(null);
      map.getCanvas().style.cursor = "";
    };
  }, [isLoaded, map, hitLayerId, sourceId, interactive]);

  return null;
}

// Tipos para capas de mapa
type MapClusterLayerProps<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties,
> = {
  // Datos GeoJSON FeatureCollection o URL para obtener datos GeoJSON
  data: string | GeoJSON.FeatureCollection<GeoJSON.Point, P>;
  // Zoom máximo para agrupar puntos (por defecto: 14)
  clusterMaxZoom?: number;
  // Radio de cada cluster cuando agrupa puntos en píxeles (por defecto: 50)
  clusterRadius?: number;
  // Colores para los círculos del cluster: [pequeño, mediano, grande] basado en el número de puntos (por defecto: ["#22c55e", "#eab308", "#ef4444"])
  clusterColors?: [string, string, string];
  // Umbrales de recuento de puntos para pasos de color/tamaño: [mediano, grande] (por defecto: [100, 750])
  clusterThresholds?: [number, number];
  // Color para puntos individuales no agrupados (por defecto: "#3b82f6")
  pointColor?: string;
  // Callback cuando se hace clic en un punto no agrupado
  onPointClick?: (
    feature: GeoJSON.Feature<GeoJSON.Point, P>,
    coordinates: [number, number],
  ) => void;
  // Callback cuando se hace clic en un cluster. Si no se proporciona, hace zoom al cluster
  onClusterClick?: (
    clusterId: number,
    coordinates: [number, number],
    pointCount: number,
  ) => void;
};

// Componente de capa de mapa con clustering de puntos
function MapClusterLayer<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties,
>({ data,
  clusterMaxZoom = 14, // Zoom máximo para agrupar puntos
  clusterRadius = 50, // Radio de cada cluster cuando agrupa puntos en píxeles
  clusterColors = ["#22c55e", "#eab308", "#ef4444"], // Colores para los círculos del cluster: [pequeño, mediano, grande] basado en el número de puntos
  clusterThresholds = [100, 750], // Umbrales de recuento de puntos para pasos de color/tamaño: [mediano, grande]
  pointColor = "#3b82f6", // Color para puntos individuales no agrupados
  onPointClick, // Callback cuando se hace clic en un punto no agrupado
  onClusterClick, // Callback cuando se hace clic en un cluster. Si no se proporciona, hace zoom al cluster
}: MapClusterLayerProps<P>) {
  const { map, isLoaded } = useMap(); // Hook que proporciona el mapa y su estado
  const id = useId(); // ID único para evitar conflictos de nombres
  const sourceId = `cluster-source-${id}`; // ID único para la fuente de datos
  const clusterLayerId = `clusters-${id}`; // ID para la capa de clusters
  const clusterCountLayerId = `cluster-count-${id}`; // ID para la capa de conteo de clusters
  const unclusteredLayerId = `unclustered-point-${id}`; // ID para la capa de puntos no agrupados

  // Se utiliza un Ref para evitar la recreación del objeto de props en cada render
  // Esto mejora el rendimiento al evitar la re-creación de layers si los datos no cambian
  const stylePropsRef = useRef({
    clusterColors,
    clusterThresholds,
    pointColor,
  });

  // Agrega fuente y capas al montar
  useEffect(() => {
    if (!isLoaded || !map) return;

    // Agrega fuente GeoJSON clusterizada
    map.addSource(sourceId, {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
    });

    // Agrega capa de círculos de clusters
    map.addLayer({
      id: clusterLayerId,
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        // Color del círculo basado en el número de puntos en el cluster
        "circle-color": [
          "step",
          ["get", "point_count"],
          clusterColors[0],
          clusterThresholds[0],
          clusterColors[1],
          clusterThresholds[1],
          clusterColors[2],
        ],
        // Tamaño del círculo basado en el número de puntos en el cluster
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20,
          clusterThresholds[0],
          30,
          clusterThresholds[1],
          40,
        ],
        // Borde blanco del círculo
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
        // Opacidad del círculo
        "circle-opacity": 0.85,
      },
    });

    // Agrega capa de texto de conteo de clusters
    map.addLayer({
      id: clusterCountLayerId,
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#fff",
      },
    });

    // Agrega capa de puntos no agrupados
    map.addLayer({
      id: unclusteredLayerId,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": pointColor,
        "circle-radius": 5,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    // Remueve fuentes y capas al desmontar
    return () => {
      try {
        if (map.getLayer(clusterCountLayerId))
          map.removeLayer(clusterCountLayerId);
        if (map.getLayer(unclusteredLayerId))
          map.removeLayer(unclusteredLayerId);
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, sourceId]);

  // Actualiza los datos de la fuente cuando cambia el prop data (solo para datos que no son URL)
  useEffect(() => {
    if (!isLoaded || !map || typeof data === "string") return;

    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData(data);
    }
  }, [isLoaded, map, data, sourceId]);

  // Actualiza los estilos de la capa cuando cambian los props
  useEffect(() => {
    if (!isLoaded || !map) return;

    const prev = stylePropsRef.current;
    const colorsChanged =
      prev.clusterColors !== clusterColors ||
      prev.clusterThresholds !== clusterThresholds;

    // Actualiza los colores y tamaños de la capa de clusters
    if (map.getLayer(clusterLayerId) && colorsChanged) {
      map.setPaintProperty(clusterLayerId, "circle-color", [
        "step",
        ["get", "point_count"],
        clusterColors[0],
        clusterThresholds[0],
        clusterColors[1],
        clusterThresholds[1],
        clusterColors[2],
      ]);
      map.setPaintProperty(clusterLayerId, "circle-radius", [
        "step",
        ["get", "point_count"],
        20,
        clusterThresholds[0],
        30,
        clusterThresholds[1],
        40,
      ]);
    }

    // Actualiza el color de la capa de puntos no agrupados
    if (map.getLayer(unclusteredLayerId) && prev.pointColor !== pointColor) {
      map.setPaintProperty(unclusteredLayerId, "circle-color", pointColor);
    }

    //  Actualiza el ref de los props
    stylePropsRef.current = { clusterColors, clusterThresholds, pointColor };
  }, [
    isLoaded,
    map,
    clusterLayerId,
    unclusteredLayerId,
    clusterColors,
    clusterThresholds,
    pointColor,
  ]);

  // Maneja eventos de click
  useEffect(() => {
    if (!isLoaded || !map) return;

    // Maneja el click en el cluster - acerca al cluster
    const handleClusterClick = async (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      });
      if (!features.length) return;

      const feature = features[0];
      const clusterId = feature.properties?.cluster_id as number;
      const pointCount = feature.properties?.point_count as number;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];

      // Si se proporciona un callback, lo ejecuta
      if (onClusterClick) {
        onClusterClick(clusterId, coordinates, pointCount);
      } else {
        // Comportamiento por defecto: acerca al cluster
        const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: coordinates,
          zoom,
        });
      }
    };

    // Maneja el click en el punto no agrupado
    const handlePointClick = (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      if (!onPointClick || !e.features?.length) return;

      const feature = e.features[0];
      const coordinates = (
        feature.geometry as GeoJSON.Point
      ).coordinates.slice() as [number, number];

      // Maneja copias del mundo
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Ejecuta el callback
      onPointClick(
        feature as unknown as GeoJSON.Feature<GeoJSON.Point, P>,
        coordinates,
      );
    };

    // Maneja el cambio de estilo del cursor
    const handleMouseEnterCluster = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeaveCluster = () => {
      map.getCanvas().style.cursor = "";
    };
    const handleMouseEnterPoint = () => {
      if (onPointClick) {
        map.getCanvas().style.cursor = "pointer";
      }
    };
    const handleMouseLeavePoint = () => {
      map.getCanvas().style.cursor = "";
    };

    // Agrega los event listeners
    map.on("click", clusterLayerId, handleClusterClick);
    map.on("click", unclusteredLayerId, handlePointClick);
    map.on("mouseenter", clusterLayerId, handleMouseEnterCluster);
    map.on("mouseleave", clusterLayerId, handleMouseLeaveCluster);
    map.on("mouseenter", unclusteredLayerId, handleMouseEnterPoint);
    map.on("mouseleave", unclusteredLayerId, handleMouseLeavePoint);

    // Remueve los event listeners al desmontar
    return () => {
      map.off("click", clusterLayerId, handleClusterClick);
      map.off("click", unclusteredLayerId, handlePointClick);
      map.off("mouseenter", clusterLayerId, handleMouseEnterCluster);
      map.off("mouseleave", clusterLayerId, handleMouseLeaveCluster);
      map.off("mouseenter", unclusteredLayerId, handleMouseEnterPoint);
      map.off("mouseleave", unclusteredLayerId, handleMouseLeavePoint);
    };
  }, [
    isLoaded,
    map,
    clusterLayerId,
    unclusteredLayerId,
    sourceId,
    onClusterClick,
    onPointClick,
  ]);

  return null;
}

// Exportación de componentes y hooks
export {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MarkerLabel,
  MapPopup,
  MapControls,
  MapRoute,
  MapArc,
  MapClusterLayer,
};

export type { MapRef, MapViewport, MapArcDatum, MapArcEvent };
