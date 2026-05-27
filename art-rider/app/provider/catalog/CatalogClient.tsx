"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import type { Listing } from "@/services/listingsService";
import { togglePublish, deleteListing } from "@/services/listingsService";
import type { Package } from "@/services/packagesService";
import { togglePackagePublish, deletePackage } from "@/services/packagesService";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";

//  Constantes para el formulario
const CATEGORIES = [
  { value: "audio",    label: "Sonido"      },
  { value: "lighting", label: "Iluminacion" },
  { value: "video",    label: "Video"       },
  { value: "effects",  label: "Efectos"     },
  { value: "other",    label: "Otro"        },
] as const;

const CATEGORY_MAP: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

//  Estilos compartidos
const cls = {
  input:
    "block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all",
  label:
    "block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
  btnSecondary:
    "inline-flex items-center justify-center border border-gray-200 text-sm font-semibold text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors",
} as const;

//  Función para formatear precios
const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ─── Atoms de UI compartidos ─────────────────────────────────────────────────

//  Card de estadísticas — flat Airbnb style
function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-4">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Kebab menu reutilizable ──────────────────────────────────────────────────
function KebabMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
        aria-label="Opciones"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 top-8 z-30 min-w-[130px] bg-white border border-slate-100 rounded-xl shadow-lg py-1 overflow-hidden"
        >
          {children}
        </div>
      )}
    </div>
  );
}

//  Badge de categoría
function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  return (
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
      {CATEGORY_MAP[category] ?? category}
    </span>
  );
}

//  Card de equipos
function EquipmentCard({ listing, onToggle, onDelete, priority = false }: {
  listing: Listing;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string, title: string | null) => void;
  /** true para los primeros items del grid (above-the-fold → LCP candidate) */
  priority?: boolean;
}) {
  return (
    <article className="bg-white border border-slate-100 rounded-xl overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Imagen 16/9 */}
      <div className="relative aspect-video bg-slate-50 shrink-0">
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.title ?? "Equipo"}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
        {/* Badge estado */}
        <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${listing.is_published ? "bg-emerald-100 text-emerald-700" : "bg-white/90 text-gray-500"}`}>
          {listing.is_published ? "Activo" : "Borrador"}
        </span>
        {/* Kebab top-right */}
        <div className="absolute top-1.5 right-1.5">
          <KebabMenu>
            <Link
              href={`/provider/catalog/${listing.id}/edit`}
              className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-slate-50 transition-colors"
            >
              Editar
            </Link>
            <button
              onClick={() => onToggle(listing.id, listing.is_published)}
              className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-slate-50 transition-colors"
            >
              {listing.is_published ? "Ocultar" : "Publicar"}
            </button>
            <button
              onClick={() => onDelete(listing.id, listing.title)}
              className="block w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              Eliminar
            </button>
          </KebabMenu>
        </div>
      </div>
      {/* Body */}
      <div className="p-3 flex flex-col flex-1 gap-0.5">
        <CategoryBadge category={listing.category} />
        <h3 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug mt-1">
          {listing.title ?? "Sin titulo"}
        </h3>
        {listing.brand && (
          <p className="text-[10px] text-slate-400">{listing.brand}{listing.model ? ` · ${listing.model}` : ""}</p>
        )}
        <p className="text-sm font-black text-gray-900 mt-auto pt-2">
          {formatPrice(listing.daily_price)}
          <span className="text-[10px] font-normal text-slate-400 ml-1">/ día</span>
        </p>
      </div>
    </article>
  );
}

//  Card de nuevo equipo — misma estructura que EquipmentCard para altura idéntica
function AddNewCard({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex flex-col hover:border-[#875B9A] hover:bg-[#875B9A]/3 transition-all group cursor-pointer">
      {/* Imagen ficticia 16/9 — mismo aspect-ratio que EquipmentCard */}
      <div className="aspect-video flex items-center justify-center bg-gray-50 group-hover:bg-[#875B9A]/5 transition-colors">
        <div className="w-9 h-9 rounded-full border-2 border-gray-200 group-hover:border-[#875B9A] group-hover:bg-[#875B9A] flex items-center justify-center transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-gray-400 group-hover:text-white transition-colors">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      </div>
      {/* Body — mismo padding que EquipmentCard */}
      <div className="p-3 flex flex-col flex-1 justify-center">
        <p className="text-xs font-semibold text-gray-500 group-hover:text-[#875B9A] transition-colors">{label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>
      </div>
      {/* Footer placeholder — mantiene altura igual */}
      <div className="px-3 py-2 border-t border-gray-100" />
    </div>
  );
}

//  Card de paquetes
function PackageCard({
  pkg,
  itemCount,
  onToggle,
  onDelete,
}: {
  pkg: Package;
  itemCount: number;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <article className="bg-white border border-slate-100 rounded-xl overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative aspect-video bg-slate-50 shrink-0">
        <Link href={`/packages/${pkg.id}`} className="block absolute inset-0">
          {pkg.cover_image_url ? (
            <Image
              src={pkg.cover_image_url}
              alt={pkg.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </div>
            </div>
          )}
        </Link>
        <span className={`absolute top-2 left-2 z-10 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${pkg.is_published ? "bg-emerald-100 text-emerald-700" : "bg-white/90 text-gray-500"}`}>
          {pkg.is_published ? "Activo" : "Borrador"}
        </span>
        {/* Kebab top-right */}
        <div className="absolute top-1.5 right-1.5 z-10">
          <KebabMenu>
            <Link
              href={`/provider/catalog/packages/${pkg.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-slate-50 transition-colors"
            >
              Editar
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(pkg.id, pkg.is_published); }}
              className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-slate-50 transition-colors"
            >
              {pkg.is_published ? "Ocultar" : "Publicar"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(pkg.id, pkg.title); }}
              className="block w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              Eliminar
            </button>
          </KebabMenu>
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1 gap-0.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full w-fit">
          {itemCount} equipo{itemCount !== 1 ? "s" : ""}
        </span>
        <h3 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug mt-1">{pkg.title}</h3>
        {pkg.description && <p className="text-[10px] text-slate-400 line-clamp-1">{pkg.description}</p>}
        <p className="text-sm font-black text-gray-900 mt-auto pt-2">
          {formatPrice(pkg.daily_price)}
          <span className="text-[10px] font-normal text-slate-400 ml-1">/ día</span>
        </p>
      </div>
    </article>
  );
}

//  Main
export default function CatalogClient({
  listings: initial,
  packages: initialPackages,
}: {
  listings: Listing[];
  packages: Package[];
}) {
  const [listings, setListings]             = useState(initial);
  const [packages, setPackages]             = useState(initialPackages);
  const [loadingId, setLoadingId]           = useState<string | null>(null);
  const [, startTransition]                 = useTransition();
  const [activeTab, setActiveTab]           = useState<"equipos" | "paquetes">("equipos");
  const [search, setSearch]                 = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // ── Modal de eliminación ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    type: "equipo" | "paquete";
  } | null>(null);

  //  Numero de equipos publicados y borradores
  const published        = listings.filter((l) => l.is_published).length;
  const drafts           = listings.filter((l) => !l.is_published).length;
  const publishedListings = listings.filter((l) => l.is_published);

  //  Filtro de equipos
  const filtered = listings.filter((l) => {
    const term = search.toLowerCase();
    const matchSearch = !term || [l.title, l.brand, l.model].some((v) => v?.toLowerCase().includes(term));
    const matchCat    = filterCategory === "all" || l.category === filterCategory;
    return matchSearch && matchCat;
  });

  //  Estado de los filtros
  const hasFilters = Boolean(search) || filterCategory !== "all";

  //  Toggle de equipo
  function handleToggle(id: string, current: boolean) {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_published: !current } : l)));
    setLoadingId(id);
    startTransition(async () => {
      const res = await togglePublish(id, current);
      if (res.error) setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_published: current } : l)));
      setLoadingId(null);
    });
  }

  //  Abrir modal de confirmación para equipo
  function handleDelete(id: string, title: string | null) {
    setDeleteTarget({ id, title: title ?? "este equipo", type: "equipo" });
  }

  //  Ejecutar eliminación real (llamado desde modal confirmado)
  function executeDelete() {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    setDeleteTarget(null);

    if (type === "equipo") {
      setLoadingId(id);
      startTransition(async () => {
        const res = await deleteListing(id);
        if (!res.error) setListings((prev) => prev.filter((l) => l.id !== id));
        setLoadingId(null);
      });
    } else {
      startTransition(async () => {
        const res = await deletePackage(id);
        if (!res.error) setPackages((prev) => prev.filter((p) => p.id !== id));
      });
    }
  }

  //  Toggle de paquete
  function handlePackageToggle(id: string, current: boolean) {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_published: !current } : p)));
    startTransition(async () => {
      const res = await togglePackagePublish(id, current);
      if (res.error) setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_published: current } : p)));
    });
  }

  //  Abrir modal de confirmación para paquete
  function handlePackageDelete(id: string, title: string) {
    setDeleteTarget({ id, title, type: "paquete" });
  }

  //  Limpiar filtros
  const clearFilters = () => { setSearch(""); setFilterCategory("all"); };

  //  Renderizado del cliente
  return (
    <><div className="space-y-8">

        {/* Encabezado del catalogo */}
        <div className="relative rounded-2xl bg-white border border-gray-200 px-7 py-7 overflow-hidden">
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Panel de proveedor</p>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mi catalogo</h1>
              <p className="text-sm text-gray-500 mt-1">
                {listings.length} equipo{listings.length !== 1 ? "s" : ""} registrado{listings.length !== 1 ? "s" : ""}
                {drafts > 0 && (
                  <span className="ml-2 bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    {drafts} {drafts === 1 ? "borrador" : "borradores"}
                  </span>
                )}
              </p>
            </div>
            <Link href="/provider/catalog/new" className={cls.btnPrimary}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo equipo
            </Link>
          </div>
        </div>

        {/* Stats — flat row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total equipos"    value={listings.length} hint={`${published} activos · ${drafts} borradores`} />
          <StatCard label="Equipos activos"  value={published}       hint="Visibles en catálogo público" />
          <StatCard label="Paquetes"         value={packages.length} hint={packages.length === 0 ? "Crea tu primer paquete" : `${packages.filter(p => p.is_published).length} publicados`} />
        </div>

        {/* Tabs + Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
            {(["equipos", "paquetes"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {tab === "equipos" ? listings.length : packages.length}
                </span>
              </button>
            ))}
          </div>

          {/* Barra de busqueda */}
          {activeTab === "equipos" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar equipos..."
                  className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all" />
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all">
                <option value="all">Todas las categorias</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Contenido */}

        {/* Lista de equipos */}
        {activeTab === "equipos" ? (
          <div className="space-y-3">
            {/* Filtros */}
            {hasFilters && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
                <button onClick={clearFilters}
                  className="text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors">
                  Limpiar filtros
                </button>
              </div>
            )}

            {/* Grid de equipos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <Link href="/provider/catalog/new" className="block"><AddNewCard label="Agregar equipo" hint="Publica un nuevo item en tu catálogo" /></Link>
              {filtered.map((listing, index) => (
                <div key={listing.id} className={loadingId === listing.id ? "opacity-40 pointer-events-none" : ""}>
                  {/* priority en los primeros 3: cubren row-1 en los 3 breakpoints del grid */}
                  <EquipmentCard listing={listing} onToggle={handleToggle} onDelete={handleDelete} priority={index < 3} />
                </div>
              ))}
            </div>

            {/* Sin resultados */}
            {listings.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center py-20 gap-2 text-center">
                <p className="text-base font-semibold text-gray-700">Sin resultados</p>
                <p className="text-sm text-gray-400">Intenta con otros terminos o cambia la categoria.</p>
                <button onClick={clearFilters} className="mt-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:underline">
                  Ver todos los equipos
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <Link href="/provider/catalog/packages/new" className="block">
                <AddNewCard
                  label="Crear paquete"
                  hint={publishedListings.length < 2 ? "Necesitas al menos 2 equipos publicados" : "Agrupa equipos para ofrecerlos juntos"}
                />
              </Link>
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  itemCount={pkg.items?.length ?? 0}
                  onToggle={handlePackageToggle}
                  onDelete={handlePackageDelete}
                />
              ))}
            </div>
            {packages.length === 0 && (
              <div className="flex flex-col items-center py-16 gap-2 text-center">
                <p className="text-sm text-gray-400">Todavia no tienes paquetes creados.</p>
                {publishedListings.length < 2 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 mt-1 font-medium">
                    Necesitas al menos 2 equipos publicados para crear un paquete.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.title ?? ""}
        itemType={deleteTarget?.type ?? "elemento"}
        onConfirm={executeDelete}
        onCancel={() => setDeleteTarget(null)}
      /></>
  );
}
