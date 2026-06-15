"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, LayoutGrid, Volume2, Zap, Video, Sparkles,
  Megaphone, Package, SlidersHorizontal, Star, ChevronDown, Check, X, ShieldCheck,
} from "lucide-react";
import type { Listing } from "@/services/listingsService";
import ExploreCard from "./ExploreCard";
import ExploreMap from "./ExploreMap";
import { EVENT_TYPES } from "@/lib/eventCategoryMap";

// ── Category config ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",         label: "Todos",        Icon: LayoutGrid },
  { id: "audio",       label: "Sonido",       Icon: Volume2    },
  { id: "lighting",    label: "Iluminación",  Icon: Zap        },
  { id: "video",       label: "Video",        Icon: Video      },
  { id: "effects",     label: "Efectos",      Icon: Sparkles   },
  { id: "advertising", label: "Publicidad",   Icon: Megaphone  },
  { id: "other",       label: "Otro",         Icon: Package    },
] as const;

const SORTS = [
  { id: "rec",        label: "Recomendados"          },
  { id: "price_asc",  label: "Precio: menor a mayor" },
  { id: "price_desc", label: "Precio: mayor a menor" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

interface Filters {
  maxPrice: number | null;   // en dólares (400 = $400)
  superhost: boolean;
}

// ── Sub-bar ────────────────────────────────────────────────────────────────────
function SubBar({
  active, onPick, query, onQuery, suggestedCategories = [],
}: {
  active: string;
  onPick: (id: string) => void;
  query: string;
  onQuery: (v: string) => void;
  suggestedCategories?: readonly string[];
}) {
  return (
    <div className="flex items-center gap-5 px-8 h-[70px] border-b border-gray-100 bg-white flex-shrink-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-2.5 h-[46px] px-4 bg-gray-100 rounded-full w-[330px] flex-shrink-0 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#875B9A]/20 focus-within:shadow-sm transition-all">
        <Search size={16} strokeWidth={2} className="text-gray-500 flex-shrink-0" />
        <input
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="¿Qué equipo o paquete buscas?"
          className="flex-1 bg-transparent border-none outline-none text-[13.5px] font-medium text-gray-900 placeholder:text-gray-400"
        />
        {query && (
          <button onClick={() => onQuery("")} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category pills */}
      <nav className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1 min-w-0">
        {CATEGORIES.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap
                border transition-all duration-150 flex-shrink-0
                ${isActive
                  ? "bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white border-transparent shadow-[0_6px_16px_-6px_rgba(135,91,154,0.55)]"
                  : "text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-800"
                }
              `}
            >
              <Icon size={17} strokeWidth={1.8} className={isActive ? "text-white" : "text-gray-400"} />
              {label}
              {suggestedCategories.includes(id) && !isActive && (
                <span className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#875B9A]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ── Filter row ─────────────────────────────────────────────────────────────────
function FilterRow({
  count, sort, onSort, filters, onFilters, onOpenPanel,
}: {
  count: number;
  sort: SortId;
  onSort: (s: SortId) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
  onOpenPanel: () => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const activeCount = (filters.maxPrice !== null ? 1 : 0) + (filters.superhost ? 1 : 0);

  // close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleChip = (key: keyof Filters, val: any) =>
    onFilters({ ...filters, [key]: filters[key] === val ? (typeof val === "boolean" ? false : null) : val });

  return (
    <div className="flex items-center justify-between gap-4 px-7 h-14 border-b border-gray-100 bg-white flex-shrink-0 z-20">
      {/* Left chips */}
      <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          onClick={onOpenPanel}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-bold text-gray-800 border border-gray-200 hover:border-gray-800 transition-all relative flex-shrink-0"
        >
          <SlidersHorizontal size={14} strokeWidth={2} />
          Filtros
          {activeCount > 0 && (
            <span className="ml-0.5 bg-[#875B9A] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {activeCount}
            </span>
          )}
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />

        <Chip
          active={filters.maxPrice === 100}
          onClick={() => toggleChip("maxPrice", 100)}
        >
          Hasta $100/día
        </Chip>
        <Chip
          active={filters.maxPrice === 200}
          onClick={() => toggleChip("maxPrice", 200)}
        >
          Hasta $200/día
        </Chip>
        <Chip
          active={filters.superhost}
          onClick={() => toggleChip("superhost", true)}
        >
          Superanfitrión
        </Chip>
      </div>

      {/* Right: count + sort */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-[12.5px] text-gray-400 font-semibold whitespace-nowrap">
          {count} {count === 1 ? "equipo" : "equipos"}
        </span>
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-1.5 text-[12.5px] text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
          >
            Ordenar: <strong className="text-gray-800 font-bold">{SORTS.find(s => s.id === sort)!.label}</strong>
            <ChevronDown size={13} />
          </button>
          {sortOpen && (
            <div className="absolute top-[calc(100%+8px)] right-0 bg-white border border-gray-100 rounded-2xl shadow-[0_12px_34px_-10px_rgba(22,19,28,.22)] p-1.5 w-56 z-50">
              {SORTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onSort(s.id as SortId); setSortOpen(false); }}
                  className={`flex items-center justify-between w-full text-left text-[13px] px-3 py-2.5 rounded-xl transition-all ${
                    s.id === sort ? "text-[#875B9A] font-bold bg-[#875B9A]/5" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s.label}
                  {s.id === sort && <Check size={15} className="text-[#875B9A]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-all flex-shrink-0
        ${active
          ? "bg-[#875B9A]/8 border-[#875B9A] text-[#6a437a]"
          : "text-gray-500 border-gray-200 hover:border-gray-700 hover:text-gray-800"
        }
      `}
    >
      {children}
    </button>
  );
}

// ── Filter panel modal ─────────────────────────────────────────────────────────
function FilterPanel({
  filters, onApply, onClose, count,
}: {
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
  count: number;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[calc(100vh-80px)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Head */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            <X size={17} />
          </button>
          <h3 className="text-[15px] font-bold text-gray-900">Filtros</h3>
          <div className="w-9" />
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-2">
          <section className="py-5 border-b border-gray-100">
            <h4 className="text-[14.5px] font-bold text-gray-900 mb-4">Precio máximo por día</h4>
            <div className="text-[22px] font-black text-gray-900">
              ${draft.maxPrice ?? 400}
              <span className="text-[12px] font-normal text-gray-400 ml-1">/ día</span>
            </div>
            <input
              type="range" min={10} max={400} step={5}
              value={draft.maxPrice ?? 400}
              onChange={e => set("maxPrice", +e.target.value === 400 ? null : +e.target.value)}
              className="w-full mt-3 mb-1 accent-[#875B9A] h-1"
            />
            <div className="flex justify-between text-[11.5px] text-gray-400 font-semibold mt-1">
              <span>$10</span><span>$400+</span>
            </div>
          </section>

          <section className="py-5">
            <h4 className="text-[14.5px] font-bold text-gray-900 mb-4">Preferencias</h4>
            <label className="flex items-center justify-between py-3 cursor-pointer">
              <div>
                <p className="text-[13.5px] font-semibold text-gray-900">Superanfitrión</p>
                <p className="text-[12px] text-gray-400">Proveedores con historial excelente</p>
              </div>
              <div
                onClick={() => set("superhost", !draft.superhost)}
                className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${draft.superhost ? "bg-[#875B9A]" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${draft.superhost ? "translate-x-5" : ""}`} />
              </div>
            </label>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => setDraft({ maxPrice: null, superhost: false })}
            className="text-[13.5px] font-bold underline text-gray-700 hover:text-gray-900"
          >
            Limpiar todo
          </button>
          <button
            onClick={() => { onApply(draft); onClose(); }}
            className="bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white text-[13.5px] font-bold px-5 py-3 rounded-xl shadow-[0_8px_20px_-8px_rgba(135,91,154,0.6)] hover:brightness-105 active:scale-95 transition-all"
          >
            Mostrar {count} {count === 1 ? "equipo" : "equipos"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main client component ──────────────────────────────────────────────────────
export default function ExploreClient({
  listings,
  initialCity,
  initialCategory,
  initialQuery,
  initialEventType,
  initialStart,
  initialEnd,
}: {
  listings: Listing[];
  initialCity?: string;
  initialCategory?: string;
  initialQuery?: string;
  initialEventType?: string;
  initialStart?: string;
  initialEnd?: string;
}) {
  const [cat, setCat]           = useState(initialCategory ?? "all");
  const [query, setQuery]       = useState(initialQuery ?? "");
  const [sort, setSort]         = useState<SortId>("rec");
  const [filters, setFilters]   = useState<Filters>({ maxPrice: null, superhost: false });
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Maintain dates in state even if not used directly for filtering yet
  const [startDate, setStartDate] = useState(initialStart ?? null);
  const [endDate, setEndDate] = useState(initialEnd ?? null);

  const activeEvent = useMemo(() => {
    if (!initialEventType) return null;
    return EVENT_TYPES.find(e => e.id === initialEventType) || null;
  }, [initialEventType]);

  // Filtered + sorted listings
  const filtered = useMemo(() => {
    let list = listings.filter(l => cat === "all" || l.category === cat);
    
    // Filter by city if one was passed in the URL
    if (initialCity) {
      const targetCity = initialCity.trim().toLowerCase();
      list = list.filter(l => l.address?.city?.toLowerCase() === targetCity);
    }

    const q = query.trim().toLowerCase();
    if (q) list = list.filter(l =>
      l.title?.toLowerCase().includes(q) ||
      l.address?.city?.toLowerCase().includes(q) ||
      (l.brand ?? "").toLowerCase().includes(q)
    );
    // maxPrice is in dollars; daily_price in cents
    if (filters.maxPrice !== null) list = list.filter(l => l.daily_price <= filters.maxPrice! * 100);
    
    // sort
    if (sort === "price_asc")  list = [...list].sort((a, b) => a.daily_price - b.daily_price);
    else if (sort === "price_desc") list = [...list].sort((a, b) => b.daily_price - a.daily_price);
    else {
      // "rec" sort -> if we have an active event, boost relevant categories to top
      if (activeEvent) {
        const catSet = new Set<string>(activeEvent.categories);
        list = [...list].sort((a, b) => {
          const aMatch = catSet.has(a.category || "") ? 1 : 0;
          const bMatch = catSet.has(b.category || "") ? 1 : 0;
          return bMatch - aMatch;
        });
      }
    }
    
    return list;
  }, [listings, cat, query, filters, sort, activeEvent]);

  // Scroll selected card into view
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-id="${selectedId}"]`) as HTMLElement | null;
    if (el) {
      const c = listRef.current;
      c.scrollTo({ top: el.offsetTop - c.offsetTop - 20, behavior: "smooth" });
    }
  }, [selectedId]);

  // Map center + display city — single source of truth
  const { mapCenter, displayCity } = useMemo(() => {
    const seed = filtered.find(l => l.address?.longitude != null && l.address?.latitude != null);
    const city = initialCity?.trim() || seed?.address?.city?.trim() || "Ecuador";
    const center = seed?.address
      ? [seed.address.longitude, seed.address.latitude] as [number, number]
      : undefined;
    return { mapCenter: center, displayCity: city };
  }, [filtered, initialCity]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white">
      {/* Sub-bar: search + categories */}
      <SubBar 
        active={cat} 
        onPick={c => { setCat(c); setSelectedId(null); }} 
        query={query} 
        onQuery={setQuery} 
        suggestedCategories={activeEvent ? activeEvent.categories : []}
      />

      {/* Filter row */}
      <FilterRow
        count={filtered.length}
        sort={sort} onSort={setSort}
        filters={filters} onFilters={setFilters}
        onOpenPanel={() => setPanelOpen(true)}
      />

      {/* Split layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: list */}
        <div ref={listRef} className="w-full lg:w-[58%] h-full overflow-y-auto flex-shrink-0 bg-white">
          <div className="px-7 pt-6 pb-24">

            {/* List header */}
            <div className="mb-6">
              <h1 className="text-[25px] font-black tracking-tight text-gray-900">
                {activeEvent ? (
                  <>
                    Equipos para tu {activeEvent.label.toLowerCase()} en{" "}
                    <span className="bg-gradient-to-r from-[#875B9A] to-[#6a437a] bg-clip-text text-transparent">
                      {displayCity}
                    </span>
                  </>
                ) : (
                  <>
                    Equipos para eventos en{" "}
                    <span className="bg-gradient-to-r from-[#875B9A] to-[#6a437a] bg-clip-text text-transparent">
                      {displayCity}
                    </span>
                  </>
                )}
              </h1>
              <p className="text-[13.5px] text-gray-400 font-medium mt-1.5">
                Alquila directo a productores locales verificados.
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <p className="text-[14px] text-gray-400 font-medium">No hay equipos con estos filtros.</p>
                <button
                  onClick={() => { setCat("all"); setQuery(""); setFilters({ maxPrice: null, superhost: false }); }}
                  className="bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white text-[13px] font-bold px-5 py-3 rounded-xl"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-8">
                {filtered.map(listing => (
                  <div key={listing.id} data-id={listing.id}>
                    <ExploreCard
                      listing={listing}
                      isHovered={hoveredId === listing.id}
                      isSelected={selectedId === listing.id}
                      onHover={() => setHoveredId(listing.id)}
                      onLeave={() => setHoveredId(null)}
                      onSelect={() => setSelectedId(s => s === listing.id ? null : listing.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: map */}
        <div className="hidden lg:block flex-1 h-full relative" style={{ boxShadow: "inset 6px 0 10px -6px rgba(0,0,0,.08)" }}>
          <ExploreMap
            listings={filtered}
            center={mapCenter}
            displayCity={displayCity}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={setHoveredId}
            onLeave={() => setHoveredId(null)}
            onSelect={(id) => setSelectedId(s => s === id ? null : id)}
          />
        </div>
      </div>

      {/* Filter modal */}
      {panelOpen && (
        <FilterPanel
          filters={filters}
          onApply={setFilters}
          onClose={() => setPanelOpen(false)}
          count={filtered.length}
        />
      )}
    </div>
  );
}
