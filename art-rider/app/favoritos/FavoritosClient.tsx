"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, ChevronRight } from "lucide-react";
import { useFavorito } from "@/hooks/useFavorito";
import type { FavoritoTipo } from "@/services/favoritosService";

// ── Design tokens (from ArtRider Favoritos.html) ──────────────────────────────
const CAT_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", advertising: "Publicidad", other: "Otro",
  paquete: "Paquete completo",
};

const CAT_GRADIENTS: Record<string, string> = {
  audio:       "from-[#875B9A] to-[#5c3569]",
  lighting:    "from-blue-600 to-blue-900",
  video:       "from-violet-600 to-violet-900",
  effects:     "from-pink-600 to-pink-900",
  advertising: "from-indigo-600 to-indigo-900",
  paquete:     "from-[#6B21A8] to-[#3b0764]",
  other:       "from-gray-500 to-gray-800",
};

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FavItem {
  id: string;
  title: string | null;
  category: string | null;
  cover_image_url: string | null;
  daily_price: number;
  city?: string;
}

// ── Card individual ───────────────────────────────────────────────────────────

function FavCard({
  item,
  tipo,
  onRemove,
}: {
  item: FavItem;
  tipo: FavoritoTipo;
  onRemove: (id: string) => void;
}) {
  const { esFavorito, toggleFavorito } = useFavorito(item.id, tipo);
  const catLabel  = CAT_LABELS[item.category ?? ""] ?? item.category ?? "Equipo";
  const gradient  = CAT_GRADIENTS[item.category ?? ""] ?? CAT_GRADIENTS.other;
  const price     = `$${(item.daily_price / 100).toFixed(0)}`;
  const href      = tipo === "equipo" ? `/listings/${item.id}` : `/packages/${item.id}`;

  const handleToggle = async (e: React.MouseEvent) => {
    await toggleFavorito(e);
    // Si ya no es favorito, remover de la lista
    if (esFavorito) onRemove(item.id);
  };

  return (
    <Link href={href} className="block group">
      {/* Foto */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient}`}
        style={{ aspectRatio: "20 / 15" }}
      >
        {item.cover_image_url ? (
          <Image
            src={item.cover_image_url}
            alt={item.title ?? ""}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <span className="text-white text-4xl">📦</span>
          </div>
        )}

        {/* Corazón — marcado en magenta */}
        <button
          onClick={handleToggle}
          aria-label="Quitar de favoritos"
          className="absolute right-2.5 top-2.5 w-[34px] h-[34px] flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill={esFavorito ? "#C026D3" : "rgba(0,0,0,0.3)"}
              stroke={esFavorito ? "#C026D3" : "white"}
            />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="pt-3 px-0.5">
        <p className="text-[11px] font-bold tracking-[.06em] uppercase text-gray-400 mb-1">
          {catLabel}
        </p>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14.5px] font-bold text-gray-900 leading-snug line-clamp-2 flex-1">
            {item.title}
          </h3>
          <span className="flex items-center gap-1 text-[13px] font-semibold flex-shrink-0 mt-0.5 text-gray-900">
            <Star size={12} strokeWidth={0} className="fill-gray-900" />
            —
          </span>
        </div>
        {item.city && (
          <p className="flex items-center gap-1 mt-1 text-[12.5px] text-gray-400 font-medium">
            <MapPin size={13} strokeWidth={1.8} className="flex-shrink-0" />
            <span className="truncate">{item.city}</span>
          </p>
        )}
        <p className="mt-2 text-[13.5px] text-gray-500">
          <strong className="text-[15.5px] font-extrabold text-gray-900">{price}</strong>
          {" "}<span className="font-normal">por día</span>
        </p>
      </div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center px-6 py-[70px]">
      {/* Ícono corazón grande morado */}
      <div
        className="w-[118px] h-[118px] rounded-full flex items-center justify-center mb-[26px]"
        style={{
          background: "#fbe9f8",
          boxShadow: "0 16px 40px -16px rgba(192,38,211,0.45)",
        }}
      >
        <svg width="56" height="56" viewBox="0 0 24 24" fill="#C026D3" stroke="#C026D3" strokeWidth="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <h2 className="text-[23px] font-extrabold text-gray-900 tracking-tight">
        Aún no tienes favoritos guardados
      </h2>
      <p className="text-[15px] text-gray-400 font-medium mt-3 max-w-[420px] leading-relaxed">
        Guarda equipos que te interesen tocando el corazón para encontrarlos fácilmente más tarde.
      </p>
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 mt-7 px-7 py-3.5 rounded-[13px] bg-[#875B9A] hover:bg-[#724a83] text-white font-bold text-[15px] transition-colors active:scale-[.97] shadow-[0_8px_20px_-8px_rgba(135,91,154,0.6)]"
      >
        Explorar equipos
        <ChevronRight size={17} strokeWidth={2.2} />
      </Link>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FavoritosClient({
  equipos: initialEquipos,
  paquetes: initialPaquetes,
}: {
  equipos: FavItem[];
  paquetes: FavItem[];
}) {
  const [tab, setTab] = useState<"equipos" | "paquetes">("equipos");
  const [equipos, setEquipos] = useState<FavItem[]>(initialEquipos);
  const [paquetes, setPaquetes] = useState<FavItem[]>(initialPaquetes);

  const removeEquipo  = (id: string) => setEquipos(prev => prev.filter(e => e.id !== id));
  const removePaquete = (id: string) => setPaquetes(prev => prev.filter(p => p.id !== id));

  const list   = tab === "equipos" ? equipos : paquetes;
  const remove = tab === "equipos" ? removeEquipo : removePaquete;
  const tipo: FavoritoTipo = tab === "equipos" ? "equipo" : "paquete";

  return (
    <main className="max-w-[1240px] mx-auto px-8 py-9 pb-20 min-h-[60vh]">

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-[30px] font-extrabold text-gray-900 tracking-tight">Favoritos</h1>
        <p className="text-[15px] text-gray-400 font-medium mt-1.5">
          Tus equipos y paquetes guardados, listos para reservar cuando lo necesites.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-7 border-b border-gray-200">
        {(["equipos", "paquetes"] as const).map(t => {
          const count = t === "equipos" ? equipos.length : paquetes.length;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative flex items-center gap-2 text-[15px] font-bold pb-4 mr-6 transition-colors"
              style={{ color: active ? "#16131c" : "#837d8e" }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span
                className="text-[12px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5"
                style={{
                  background: active ? "#fbe9f8" : "#f2f1f5",
                  color: active ? "#86198f" : "#46414f",
                }}
              >
                {count}
              </span>
              {active && (
                <span
                  className="absolute left-0 right-0 bottom-[-1px] h-[2.5px] rounded-sm bg-[#875B9A]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Grid o empty */}
      {list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-[22px] gap-y-[30px]">
          {list.map(item => (
            <FavCard key={item.id} item={item} tipo={tipo} onRemove={remove} />
          ))}
        </div>
      )}
    </main>
  );
}
