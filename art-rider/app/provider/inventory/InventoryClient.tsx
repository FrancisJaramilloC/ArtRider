"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { togglePublish } from "@/services/listingsService";
import { togglePackagePublish } from "@/services/packagesService";
import type { Listing } from "@/services/listingsService";
import type { Package } from "@/services/packagesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ─── ItemRow ─────────────────────────────────────────────────────────────────

function ItemRow({
  id,
  href,
  title,
  subtitle,
  imageUrl,
  dailyPrice,
  isPublished,
  badge,
  loading,
  onTogglePublish,
}: {
  id: string;
  href: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string | null;
  dailyPrice: number;
  isPublished: boolean;
  badge?: string;
  loading: boolean;
  onTogglePublish: (id: string, current: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
        loading
          ? "opacity-50 pointer-events-none"
          : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
      }`}
    >
      {/* Thumbnail + Info — navegables */}
      <Link href={href} className="flex items-center gap-4 flex-1 min-w-0 group">
        {/* Thumbnail */}
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
          {imageUrl ? (
            <Image src={imageUrl} alt={title} fill sizes="56px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#875B9A] transition-colors">
              {title}
            </p>
            {badge && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-black text-gray-900">{formatPrice(dailyPrice)}</span>
            <span className="text-xs text-gray-400">/ día</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPublished ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              {isPublished ? "Publicado" : "Borrador"}
            </span>
          </div>
        </div>
      </Link>

      {/* Toggle publicación */}
      <button
        onClick={() => onTogglePublish(id, isPublished)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
          isPublished
            ? "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50"
            : "border-[#875B9A]/30 text-[#875B9A] hover:bg-[#875B9A]/5"
        }`}
      >
        {isPublished ? "Ocultar" : "Publicar"}
      </button>
    </div>
  );
}

// ─── Nota disponibilidad ──────────────────────────────────────────────────────

function CalendarNote() {
  return (
    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
      <svg
        className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
      <div>
        <p className="text-xs font-semibold text-blue-800">Bloqueo por fechas</p>
        <p className="text-xs text-blue-600 mt-0.5">
          Los bloqueos de mantenimiento y uso privado por fechas específicas se gestionan
          automáticamente desde <strong>availability_calendar</strong> (MAINTENANCE / BLOCKED).
          Usa el panel de reservas para ver rangos bloqueados.
        </p>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-16 gap-2 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-2">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      </div>
      <p className="text-sm text-gray-500 font-medium">{message}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function InventoryClient({
  initialListings,
  initialPackages,
}: {
  initialListings: Listing[];
  initialPackages: Package[];
}) {
  const [listings, setListings]   = useState(initialListings);
  const [packages, setPackages]   = useState(initialPackages);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"equipos" | "paquetes">("equipos");
  const [, startTransition]       = useTransition();

  // KPIs
  const publishedListings  = listings.filter((l) => l.is_published).length;
  const draftListings      = listings.filter((l) => !l.is_published).length;
  const publishedPackages  = packages.filter((p) => p.is_published).length;

  function handleListingToggle(id: string, current: boolean) {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_published: !current } : l)));
    setLoadingId(id);
    startTransition(async () => {
      const res = await togglePublish(id, current);
      if (res.error) {
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_published: current } : l)));
      }
      setLoadingId(null);
    });
  }

  function handlePackageToggle(id: string, current: boolean) {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_published: !current } : p)));
    setLoadingId(id);
    startTransition(async () => {
      const res = await togglePackagePublish(id, current);
      if (res.error) {
        setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_published: current } : p)));
      }
      setLoadingId(null);
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
          Panel de proveedor
        </p>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventario</h1>
        <p className="text-sm text-gray-500 mt-1">
          Controla la visibilidad de equipos y paquetes. Los bloqueos por fecha se gestionan desde
          el calendario de disponibilidad.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            Equipos
          </p>
          <p className="text-3xl font-black text-gray-900">{listings.length}</p>
          <p className="text-xs text-gray-400 mt-1">total registrados</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            Publicados
          </p>
          <p className="text-3xl font-black text-emerald-600">{publishedListings}</p>
          <p className="text-xs text-gray-400 mt-1">equipos visibles</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            Borradores
          </p>
          <p className="text-3xl font-black text-amber-500">{draftListings}</p>
          <p className="text-xs text-gray-400 mt-1">equipos ocultos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            Paquetes activos
          </p>
          <p className="text-3xl font-black text-[#875B9A]">{publishedPackages}</p>
          <p className="text-xs text-gray-400 mt-1">de {packages.length} total</p>
        </div>
      </div>

      {/* Nota sobre availability_calendar */}
      <CalendarNote />

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 w-fit">
        {(["equipos", "paquetes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              activeTab === tab
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {tab === "equipos" ? listings.length : packages.length}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {activeTab === "equipos" ? (
        <div className="space-y-2">
          {listings.length === 0 ? (
            <EmptyState message="No tienes equipos publicados aún." />
          ) : (
            listings.map((l) => (
              <ItemRow
                key={l.id}
                id={l.id}
                href={`/listings/${l.id}`}
                title={l.title ?? "Sin título"}
                subtitle={[l.brand, l.model].filter(Boolean).join(" · ")}
                imageUrl={l.cover_image_url}
                dailyPrice={l.daily_price}
                isPublished={l.is_published}
                badge={l.category ?? undefined}
                loading={loadingId === l.id}
                onTogglePublish={handleListingToggle}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {packages.length === 0 ? (
            <EmptyState message="No tienes paquetes creados aún." />
          ) : (
            packages.map((p) => (
              <ItemRow
                key={p.id}
                id={p.id}
                href={`/packages/${p.id}`}
                title={p.title}
                subtitle={`${p.items?.length ?? 0} equipo${(p.items?.length ?? 0) !== 1 ? "s" : ""} incluido${(p.items?.length ?? 0) !== 1 ? "s" : ""}`}
                imageUrl={p.cover_image_url}
                dailyPrice={p.daily_price}
                isPublished={p.is_published}
                badge="Paquete"
                loading={loadingId === p.id}
                onTogglePublish={handlePackageToggle}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
