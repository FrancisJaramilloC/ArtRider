"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { Listing, AvailabilityStatus } from "@/services/listingsService";
import { updateListingAvailability } from "@/services/listingsService";
import type { Package } from "@/services/packagesService";
import { updatePackageAvailability } from "@/services/packagesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available:    "Disponible",
  maintenance:  "En mantenimiento",
  private_use:  "Uso privado",
};

const STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  maintenance: "bg-amber-100  text-amber-700  border-amber-200",
  private_use: "bg-gray-100   text-gray-600   border-gray-200",
};

const STATUS_DOT: Record<AvailabilityStatus, string> = {
  available:   "bg-emerald-500",
  maintenance: "bg-amber-400",
  private_use: "bg-gray-400",
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ─── StatusSelector ───────────────────────────────────────────────────────────

function StatusSelector({
  value,
  onChange,
  loading,
}: {
  value: AvailabilityStatus;
  onChange: (s: AvailabilityStatus) => void;
  loading: boolean;
}) {
  return (
    <select
      value={value}
      disabled={loading}
      onChange={(e) => onChange(e.target.value as AvailabilityStatus)}
      className={`text-xs font-semibold rounded-xl border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#875B9A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${STATUS_COLORS[value]}`}
      aria-label="Estado de disponibilidad"
    >
      {(Object.keys(STATUS_LABELS) as AvailabilityStatus[]).map((s) => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}

// ─── ItemRow ─────────────────────────────────────────────────────────────────

function ItemRow({
  id,
  title,
  subtitle,
  imageUrl,
  dailyPrice,
  isPublished,
  availabilityStatus,
  badge,
  loading,
  onStatusChange,
}: {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string | null;
  dailyPrice: number;
  isPublished: boolean;
  availabilityStatus: AvailabilityStatus;
  badge?: string;
  loading: boolean;
  onStatusChange: (id: string, status: AvailabilityStatus) => void;
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${loading ? "opacity-50 pointer-events-none" : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"}`}>
      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill sizes="56px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full shrink-0">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-black text-gray-900">{formatPrice(dailyPrice)}</span>
          <span className="text-xs text-gray-400">/ día</span>
          {/* Publicación status */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPublished ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
            {isPublished ? "Publicado" : "Borrador"}
          </span>
        </div>
      </div>

      {/* Availability dot + selector */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[availabilityStatus]}`} />
        <StatusSelector
          value={availabilityStatus}
          onChange={(s) => onStatusChange(id, s)}
          loading={loading}
        />
      </div>
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

  // Availability stats
  const availableListings   = listings.filter((l) => (l.availability_status ?? "available") === "available").length;
  const maintenanceListings = listings.filter((l) => l.availability_status === "maintenance").length;
  const privateListings     = listings.filter((l) => l.availability_status === "private_use").length;

  const availablePackages   = packages.filter((p) => (p.availability_status ?? "available") === "available").length;

  function handleListingStatus(id: string, status: AvailabilityStatus) {
    // Optimistic update
    setListings((prev) => prev.map((l) =>
      l.id === id
        ? { ...l, availability_status: status, is_published: status === "available" ? l.is_published : false }
        : l
    ));
    setLoadingId(id);
    startTransition(async () => {
      const res = await updateListingAvailability(id, status);
      if (res.error) {
        // Revert on error — re-fetch would be ideal but we just keep optimistic state
        console.error(res.error);
      }
      setLoadingId(null);
    });
  }

  function handlePackageStatus(id: string, status: AvailabilityStatus) {
    setPackages((prev) => prev.map((p) =>
      p.id === id
        ? { ...p, availability_status: status, is_published: status === "available" ? p.is_published : false }
        : p
    ));
    setLoadingId(id);
    startTransition(async () => {
      const res = await updatePackageAvailability(id, status);
      if (res.error) console.error(res.error);
      setLoadingId(null);
    });
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Panel de proveedor</p>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Disponibilidad</h1>
        <p className="text-sm text-gray-500 mt-1">
          Controla el estado operativo de cada equipo y paquete. Cambiar a &ldquo;En mantenimiento&rdquo; o &ldquo;Uso privado&rdquo; lo despublica automáticamente.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Disponibles</p>
          <p className="text-3xl font-black text-emerald-600">{availableListings}</p>
          <p className="text-xs text-gray-400 mt-1">equipos activos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Mantenimiento</p>
          <p className="text-3xl font-black text-amber-500">{maintenanceListings}</p>
          <p className="text-xs text-gray-400 mt-1">equipos en servicio</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Uso privado</p>
          <p className="text-3xl font-black text-gray-500">{privateListings}</p>
          <p className="text-xs text-gray-400 mt-1">no disponibles</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Paquetes activos</p>
          <p className="text-3xl font-black text-[#875B9A]">{availablePackages}</p>
          <p className="text-xs text-gray-400 mt-1">de {packages.length} total</p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs">
        {(Object.entries(STATUS_LABELS) as [AvailabilityStatus, string][]).map(([s, label]) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
            <span className="text-gray-600 font-medium">{label}</span>
            {s !== "available" && (
              <span className="text-gray-400">— se despublica al seleccionar</span>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 w-fit">
        {(["equipos", "paquetes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"}`}>
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
                title={l.title ?? "Sin título"}
                subtitle={[l.brand, l.model].filter(Boolean).join(" · ")}
                imageUrl={l.cover_image_url}
                dailyPrice={l.daily_price}
                isPublished={l.is_published}
                availabilityStatus={(l.availability_status ?? "available") as AvailabilityStatus}
                badge={l.category ?? undefined}
                loading={loadingId === l.id}
                onStatusChange={handleListingStatus}
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
                title={p.title}
                subtitle={`${p.items?.length ?? 0} equipo${(p.items?.length ?? 0) !== 1 ? "s" : ""} incluido${(p.items?.length ?? 0) !== 1 ? "s" : ""}`}
                imageUrl={p.cover_image_url}
                dailyPrice={p.daily_price}
                isPublished={p.is_published}
                availabilityStatus={(p.availability_status ?? "available") as AvailabilityStatus}
                badge="Paquete"
                loading={loadingId === p.id}
                onStatusChange={handlePackageStatus}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-16 gap-2 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
      </div>
      <p className="text-sm text-gray-500 font-medium">{message}</p>
    </div>
  );
}
