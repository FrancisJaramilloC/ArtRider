"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, MapPin, Volume2, Monitor, Zap, Music, Plug,
} from "lucide-react";
import {
  EVENT_TYPES,
  POPULAR_SEARCHES,
  CATEGORY_LABELS,
  haversineKm,
} from "@/lib/eventCategoryMap";
import type { CityInfo, EventTypeId } from "@/lib/eventCategoryMap";

// ── SVG illustrations for event types ─────────────────────────────────────────

function EventIcon({ id }: { id: string }) {
  const SIZE = 40;
  const common = { width: SIZE, height: SIZE, viewBox: "0 0 40 40", fill: "none", xmlns: "http://www.w3.org/2000/svg" };

  const icons: Record<string, { bg: string; el: React.ReactNode }> = {
    fiesta: {
      bg: "bg-violet-50",
      el: (
        <>
          <circle cx="14" cy="16" r="3" stroke="#875B9A" strokeWidth="1.5" />
          <path d="M14 13V8" stroke="#875B9A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="26" cy="14" r="3" stroke="#a97dc4" strokeWidth="1.5" />
          <path d="M26 11V6" stroke="#a97dc4" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 28c0-4 3-6 6-6s6 2 6 6" stroke="#875B9A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="26" r="1.5" fill="#a97dc4" />
          <circle cx="30" cy="22" r="1" fill="#875B9A" />
          <path d="M24 30l2-4 2 4" stroke="#a97dc4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ),
    },
    boda: {
      bg: "bg-rose-50",
      el: (
        <>
          <circle cx="13" cy="14" r="3" stroke="#875B9A" strokeWidth="1.5" />
          <path d="M7 26c0-3 3-5 6-5s6 2 6 5" stroke="#875B9A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="27" cy="14" r="3" stroke="#a97dc4" strokeWidth="1.5" />
          <path d="M21 26c0-3 3-5 6-5s6 2 6 5" stroke="#a97dc4" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M20 18c-0.5-0.5-1.5-0.5-2 0s-0.5 1.5 0 2l2 2 2-2c0.5-0.5 0.5-1.5 0-2s-1.5-0.5-2 0z" fill="#f43f5e" />
        </>
      ),
    },
    graduacion: {
      bg: "bg-amber-50",
      el: (
        <>
          <rect x="10" y="18" width="20" height="3" rx="1" stroke="#875B9A" strokeWidth="1.5" />
          <polygon points="20,8 30,16 10,16" stroke="#875B9A" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
          <path d="M28 16v8" stroke="#a97dc4" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="28" cy="26" r="2" stroke="#a97dc4" strokeWidth="1.5" />
          <path d="M15 21v6c0 2 5 3 5 3s5-1 5-3v-6" stroke="#875B9A" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ),
    },
    concierto: {
      bg: "bg-purple-50",
      el: (
        <>
          <rect x="18" y="14" width="4" height="16" rx="2" stroke="#875B9A" strokeWidth="1.5" />
          <path d="M14 14a6 6 0 0 1 12 0" stroke="#875B9A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M10 12a10 10 0 0 1 20 0" stroke="#a97dc4" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="12" cy="26" r="1.5" fill="#a97dc4" />
          <circle cx="28" cy="24" r="1" fill="#875B9A" />
        </>
      ),
    },
    corporativo: {
      bg: "bg-sky-50",
      el: (
        <>
          <rect x="8" y="14" width="24" height="16" rx="2" stroke="#875B9A" strokeWidth="1.5" />
          <path d="M8 20h24" stroke="#a97dc4" strokeWidth="1.5" />
          <rect x="16" y="10" width="8" height="4" rx="1" stroke="#875B9A" strokeWidth="1.5" />
          <circle cx="20" cy="25" r="2" stroke="#a97dc4" strokeWidth="1.5" />
        </>
      ),
    },

    audiovisual: {
      bg: "bg-indigo-50",
      el: (
        <>
          <rect x="8" y="12" width="18" height="14" rx="2" stroke="#875B9A" strokeWidth="1.5" />
          <circle cx="17" cy="19" r="4" stroke="#a97dc4" strokeWidth="1.5" />
          <path d="M26 12l6-4v22l-6-4" stroke="#875B9A" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
          <circle cx="17" cy="19" r="1.5" fill="#875B9A" />
        </>
      ),
    },
  };

  const icon = icons[id] ?? icons.fiesta;
  return (
    <div className={`w-10 h-10 rounded-xl ${icon.bg} flex items-center justify-center shrink-0`}>
      <svg {...common}>{icon.el}</svg>
    </div>
  );
}

// ── SVG illustrations for city regions ────────────────────────────────────────

function CityIcon({ state }: { state: string }) {
  const SIZE = 48;
  const common = { width: SIZE, height: SIZE, viewBox: "0 0 48 48", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  const s = state.toLowerCase();

  // Costa
  if (["guayas", "manabí", "santa elena", "esmeraldas", "el oro", "los ríos"].some(r => s.includes(r))) {
    return (
      <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
        <svg {...common}>
          <path d="M6 32c4-2 8 2 12 0s8-4 12-2 8 2 12 0" stroke="#875B9A" strokeWidth="1.5" fill="none" />
          <path d="M6 36c4-2 8 2 12 0s8-4 12-2 8 2 12 0" stroke="#a97dc4" strokeWidth="1.2" fill="none" />
          <path d="M30 10v22" stroke="#875B9A" strokeWidth="1.5" />
          <path d="M30 10c3 2 7 2 7 6s-4 4-7 4" stroke="#6a437a" strokeWidth="1.5" fill="none" />
          <circle cx="16" cy="26" r="6" stroke="#a97dc4" strokeWidth="1.3" fill="none" />
        </svg>
      </div>
    );
  }

  // Oriente
  if (["zamora chinchipe", "zamora", "morona santiago", "pastaza", "napo", "sucumbíos", "orellana"].some(r => s.includes(r))) {
    return (
      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        <svg {...common}>
          <path d="M10 38c2-10 4-20 8-26" stroke="#6a437a" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 12c-6 2-8 6-6 10 2-2 6-3 8-2-4 0-7 3-6 7 3-2 7-2 9 0-3-1-5 2-4 5" stroke="#875B9A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M28 38c2-8 3-16 5-22" stroke="#a97dc4" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M33 16c4 1 6 4 5 8-2-1-5-1-7 1 3-1 5 2 4 5" stroke="#a97dc4" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M6 38h36" stroke="#875B9A" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Sierra (default)
  return (
    <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
      <svg {...common}>
        <path d="M4 36l10-18 6 8 8-16 8 12 8-4v18H4z" stroke="#875B9A" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        <path d="M14 18l2-3 2 3" stroke="#a97dc4" strokeWidth="1.2" fill="none" />
        <path d="M28 10l3-4 3 4" stroke="#a97dc4" strokeWidth="1.2" fill="none" />
        <rect x="20" y="28" width="6" height="8" rx="1" stroke="#875B9A" strokeWidth="1.3" />
        <path d="M23 28v-4" stroke="#a97dc4" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="23" cy="22" r="1.5" stroke="#a97dc4" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

// ── Lucide icon map for popular searches ──────────────────────────────────────
const POPULAR_ICONS = [Volume2, Monitor, Zap, Music, Plug];

// ── Category chip icons ──────────────────────────────────────────────────────
import { Volume2 as CatAudio, Zap as CatLight, Video as CatVideo, Sparkles as CatFx, Megaphone as CatAd } from "lucide-react";
const CAT_ICONS: Record<string, typeof Volume2> = {
  audio: CatAudio, lighting: CatLight, video: CatVideo, effects: CatFx, advertising: CatAd,
};

// ── Main Component ───────────────────────────────────────────────────────────

interface SearchDiscoveryPanelProps {
  cities: CityInfo[];
  activeTab: "event" | "date" | "location";
  selectedEvent: EventTypeId | null;
  onSelectEvent: (id: EventTypeId) => void;
  onSelectCity: (city: CityInfo) => void;
  startDate: string | null;
  endDate: string | null;
  onSelectDates: (start: string | null, end: string | null) => void;
  onClose: () => void;
}

export default function SearchDiscoveryPanel({
  cities,
  activeTab,
  selectedEvent,
  onSelectEvent,
  onSelectCity,
  startDate,
  endDate,
  onSelectDates,
  onClose,
}: SearchDiscoveryPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [eventFilter, setEventFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoRequested, setGeoRequested] = useState(false);

  // Request geolocation once
  useEffect(() => {
    if (geoRequested) return;
    setGeoRequested(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* user denied — no "Cerca de ti" section */ },
        { timeout: 5000 },
      );
    }
  }, [geoRequested]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Filtered event list
  const filteredEvents = useMemo(() => {
    const q = eventFilter.toLowerCase().trim();
    if (!q) return EVENT_TYPES;
    return EVENT_TYPES.filter(
      (e) => e.label.toLowerCase().includes(q) || e.subtitle.toLowerCase().includes(q),
    );
  }, [eventFilter]);

  // Sorted & filtered cities
  const { nearbyCities, availabilityCities } = useMemo(() => {
    const q = cityFilter.toLowerCase().trim();
    let filtered = cities.filter((c) => c.count > 0);
    if (q) {
      filtered = filtered.filter(
        (c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
      );
    }

    let nearby: CityInfo[] = [];
    if (userPos && !q) {
      nearby = [...filtered]
        .map((c) => ({ ...c, dist: haversineKm(userPos.lat, userPos.lng, c.lat, c.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 4);
    }

    const byAvailability = [...filtered].sort((a, b) => b.count - a.count);
    return { nearbyCities: nearby, availabilityCities: byAvailability };
  }, [cities, cityFilter, userPos]);

  // City description helper
  function getCityDescription(city: CityInfo, isNearest: boolean): string {
    if (isNearest) return "Equipos disponibles cerca de tu ubicación";
    if (city.count >= 5) return "Amplia variedad de equipos disponibles";
    if (city.hasRecent) return "Equipos publicados recientemente";
    return "Proveedores disponibles para eventos";
  }

  // Selected event categories chips
  const selectedEventData = selectedEvent
    ? EVENT_TYPES.find((e) => e.id === selectedEvent)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50 w-[calc(100vw-32px)] sm:w-[600px] bg-white border border-gray-100 rounded-3xl shadow-[0_12px_34px_-10px_rgba(22,19,28,.22)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      >
        {/* Content */}
        <div className="max-h-[min(420px,60vh)] overflow-y-auto">
          {/* ── Tab 1: Event type ── */}
          {activeTab === "event" && (
            <div className="p-3">
              {/* Search input */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl mb-2">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  placeholder="Buscar tipo de evento..."
                  className="flex-1 bg-transparent text-[14px] text-gray-900 placeholder:text-gray-400 outline-none font-medium"
                  autoFocus
                />
                {eventFilter && (
                  <button onClick={() => setEventFilter("")} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Event list */}
              <div className="space-y-0.5">
                {filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onSelectEvent(event.id as EventTypeId)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors duration-150 ${
                      selectedEvent === event.id
                        ? "bg-[#875B9A]/[0.06]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <EventIcon id={event.id} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-gray-900">{event.label}</p>
                      <p className="text-[12.5px] text-gray-400 font-medium">{event.subtitle}</p>
                    </div>
                    {selectedEvent === event.id && (
                      <span className="w-2 h-2 rounded-full bg-[#875B9A] shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Category chips (shown when event is selected) */}
              {selectedEventData && (
                <div className="flex flex-wrap gap-2 px-3 pt-3 pb-1 border-t border-gray-100 mt-2">
                  {selectedEventData.categories.map((cat) => {
                    const Icon = CAT_ICONS[cat];
                    return (
                      <span
                        key={cat}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-700"
                      >
                        {Icon && <Icon size={14} className="text-[#875B9A]" />}
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 2: Location ── */}
          {activeTab === "location" && (
            <div className="p-3">
              {/* Search input */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl mb-2">
                <MapPin size={15} className="text-gray-400 shrink-0" />
                <input
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Buscar ciudad..."
                  className="flex-1 bg-transparent text-[14px] text-gray-900 placeholder:text-gray-400 outline-none font-medium"
                  autoFocus
                />
                {cityFilter && (
                  <button onClick={() => setCityFilter("")} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Nearby cities */}
              {nearbyCities.length > 0 && !cityFilter && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-2 mt-3">
                    Cerca de ti
                  </p>
                  <div className="space-y-0.5">
                    {nearbyCities.map((city, i) => (
                      <button
                        key={`near-${city.city}`}
                        onClick={() => onSelectCity(city)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-gray-50 transition-colors duration-150"
                      >
                        <CityIcon state={city.state} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-gray-900">
                            {city.city}, {city.state}
                          </p>
                          <p className="text-[12.5px] text-gray-400 font-medium">
                            {getCityDescription(city, i === 0)}
                          </p>
                        </div>
                        <span className={`text-[12px] font-medium shrink-0 ${city.count <= 2 ? "text-gray-300" : "text-gray-400"}`}>
                          {city.count} equipo{city.count !== 1 ? "s" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-b border-gray-100 my-2" />
                </>
              )}

              {/* All cities by availability */}
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-2 mt-3">
                {cityFilter ? "Resultados" : "Más disponibilidad"}
              </p>
              <div className="space-y-0.5">
                {availabilityCities.map((city) => (
                  <button
                    key={`avail-${city.city}`}
                    onClick={() => onSelectCity(city)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-gray-50 transition-colors duration-150"
                  >
                    <CityIcon state={city.state} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-gray-900">
                        {city.city}, {city.state}
                      </p>
                      <p className="text-[12.5px] text-gray-400 font-medium">
                        {getCityDescription(city, false)}
                      </p>
                    </div>
                    <span className={`text-[12px] font-medium shrink-0 ${city.count <= 2 ? "text-gray-300" : "text-gray-400"}`}>
                      {city.count} equipo{city.count !== 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
                {availabilityCities.length === 0 && (
                  <p className="text-[13px] text-gray-400 text-center py-6">
                    No hay ciudades con equipos disponibles
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Tab 3: Date ── */}
          {activeTab === "date" && (
            <div className="p-8 pb-10 flex flex-col items-center">
              <h3 className="text-[16px] font-bold text-gray-900 mb-6">Selecciona las fechas de tu evento</h3>
              <div className="flex items-center gap-4 w-full max-w-[400px]">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 ml-1">
                    Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate ?? ""}
                    onChange={(e) => onSelectDates(e.target.value || null, endDate)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-900 outline-none focus:border-[#875B9A] focus:ring-1 focus:ring-[#875B9A] transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 ml-1">
                    Fin
                  </label>
                  <input
                    type="date"
                    value={endDate ?? ""}
                    onChange={(e) => onSelectDates(startDate, e.target.value || null)}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-900 outline-none focus:border-[#875B9A] focus:ring-1 focus:ring-[#875B9A] transition-all"
                  />
                </div>
              </div>
              <p className="text-[13px] text-gray-400 mt-6 text-center max-w-[360px]">
                Seleccionar fechas nos ayuda a mostrarte los equipos que realmente estarán disponibles para tu evento.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
