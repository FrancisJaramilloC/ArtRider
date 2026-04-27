"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/services/listingsService";
import { togglePublish, deleteListing, createListing } from "@/services/listingsService";


const BRAND = {
  main: "#5c2d7e",
  hover: "#4a2465",
  tint: "#f5effe",
  tintBorder: "#dcc9ee",
  badge: "#875b9a",
} as const;

const CATEGORIES = [
  { value: "audio",    label: "Sonido"      },
  { value: "lighting", label: "Iluminacion" },
  { value: "video",    label: "Video"       },
  { value: "effects",  label: "Efectos"     },
  { value: "other",    label: "Otro"        },
];

const CATEGORY_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminacion", video: "Video",
  effects: "Efectos", other: "Otro",
};

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        <span className="text-4xl font-black text-gray-900">{value}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: BRAND.tint }}
      >
        {icon}
      </div>
    </div>
  );
}

// ── Create Equipment Modal ─────────────────────────────────────────────────────
// Formulario en un solo paso, lenguaje directo, sin tecnicismos.

function CreateEquipmentModal({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef      = useRef<HTMLFormElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5 MB.");
      e.target.value = "";
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("publishNow", String(publishNow));
    setServerError(null);
    startTransition(async () => {
      const result = await createListing(null, fd);
      if (result?.error) { setServerError(result.error); return; }
      onClose();
      window.location.reload();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Nuevo equipo</h2>
            <p className="text-xs text-gray-500 mt-0.5">Completa los campos para agregar un equipo a tu catalogo</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600 text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form ref={formRef} id="create-equipment-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Error banner */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600 font-medium">{serverError}</p>
              </div>
            )}

            {/* Cover image */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-800">
                Foto del equipo <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500">Una imagen clara del equipo desde el frente.</p>
              <div
                className="relative w-full h-44 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer transition-colors hover:border-[#5c2d7e] hover:bg-[#f5effe] group"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <>
                    <Image src={previewUrl} alt="Vista previa del equipo" fill className="object-cover rounded-2xl" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                      <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full">Cambiar imagen</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#5c2d7e] transition-colors">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-sm font-medium">Seleccionar imagen</span>
                    <span className="text-xs">JPG, PNG o WebP — max 5 MB</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="coverImage"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="eq-title" className="block text-sm font-semibold text-gray-800">
                Nombre del equipo <span className="text-red-500">*</span>
              </label>
              <input
                id="eq-title"
                name="title"
                type="text"
                required
                minLength={3}
                maxLength={100}
                placeholder="Ej: Parlante profesional 1000W"
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5c2d7e] focus:border-transparent transition-all"
              />
            </div>

            {/* Brand + Model */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="eq-brand" className="block text-sm font-semibold text-gray-800">Marca</label>
                <input
                  id="eq-brand"
                  name="brand"
                  type="text"
                  maxLength={60}
                  placeholder="Ej: JBL"
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5c2d7e] focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="eq-model" className="block text-sm font-semibold text-gray-800">Modelo</label>
                <input
                  id="eq-model"
                  name="model"
                  type="text"
                  maxLength={60}
                  placeholder="Ej: EON615"
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5c2d7e] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Category — visual radio grid */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Categoria <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 cursor-pointer hover:border-[#5c2d7e] hover:bg-[#f5effe] transition-all has-[:checked]:border-[#5c2d7e] has-[:checked]:bg-[#f5effe]"
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      required
                      className="accent-[#5c2d7e]"
                    />
                    <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Daily price */}
            <div className="space-y-1.5">
              <label htmlFor="eq-price" className="block text-sm font-semibold text-gray-800">
                Precio por dia (USD) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-500 text-sm font-semibold select-none">$</span>
                <input
                  id="eq-price"
                  name="dailyPrice"
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5c2d7e] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="eq-desc" className="block text-sm font-semibold text-gray-800">
                Descripcion <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="eq-desc"
                name="description"
                rows={3}
                maxLength={1000}
                placeholder="Estado del equipo, que incluye, condiciones especiales de alquiler..."
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5c2d7e] focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Publish toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={publishNow}
              onClick={() => setPublishNow(!publishNow)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                publishNow
                  ? "border-[#5c2d7e] bg-[#f5effe]"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div
                className={`relative w-10 h-5 rounded-full shrink-0 transition-colors ${publishNow ? "bg-[#5c2d7e]" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${publishNow ? "translate-x-5" : "translate-x-0"}`}
                />
              </div>
              <input type="hidden" name="publishNow" value={String(publishNow)} />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {publishNow ? "Publicar inmediatamente" : "Guardar como borrador"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {publishNow
                    ? "El equipo sera visible en el catalogo publico para reservas."
                    : "Solo tu podras ver este equipo hasta que lo publiques."}
                </p>
              </div>
            </button>
          </form>
        </div>

        {/* Fixed footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-equipment-form"
            disabled={isPending}
            style={{ background: isPending ? undefined : BRAND.main }}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed hover:opacity-90"
          >
            {isPending ? "Guardando..." : "Guardar equipo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Equipment Card ─────────────────────────────────────────────────────────────

function EquipmentCard({
  listing,
  onToggle,
  onDelete,
  loadingId,
}: {
  listing: Listing;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string, title: string | null) => void;
  loadingId: string | null;
}) {
  const isLoading  = loadingId === listing.id;
  const price      = `$${(listing.daily_price / 100).toFixed(2)}`;
  const categoryLabel = CATEGORY_LABELS[listing.category ?? ""] ?? listing.category;

  return (
    <article
      className={`bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all duration-200 ${
        isLoading ? "opacity-40 pointer-events-none" : "hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Cover */}
      <div className="relative w-full h-44 bg-gray-100 shrink-0">
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.title ?? "Equipo"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {/* Status pill */}
        <span
          className={`absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
            listing.is_published
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {listing.is_published ? "Activo" : "Borrador"}
        </span>

        {/* Category pill */}
        {categoryLabel && (
          <span
            className="absolute bottom-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
            style={{ background: BRAND.badge, opacity: 0.9 }}
          >
            {categoryLabel}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-1">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
          {listing.title ?? "Sin titulo"}
        </h3>
        {listing.brand && (
          <p className="text-xs text-gray-400 font-medium">
            {listing.brand}{listing.model ? ` · ${listing.model}` : ""}
          </p>
        )}
        <p className="text-lg font-extrabold mt-auto pt-2" style={{ color: BRAND.main }}>
          {price}
          <span className="text-xs font-normal text-gray-400 ml-1">/ dia</span>
        </p>
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link
          href={`/provider/catalog/${listing.id}/edit`}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Editar
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(listing.id, listing.is_published)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors"
            style={
              listing.is_published
                ? { background: "#f5f5f5", color: "#555", border: "1px solid #e5e7eb" }
                : { background: BRAND.tint, color: BRAND.main, border: `1px solid ${BRAND.tintBorder}` }
            }
          >
            {listing.is_published ? "Despublicar" : "Publicar"}
          </button>
          <button
            onClick={() => onDelete(listing.id, listing.title)}
            className="text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Add-New placeholder card ───────────────────────────────────────────────────

function AddNewCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl min-h-[280px] w-full transition-all hover:border-[#5c2d7e] hover:bg-[#f5effe] group cursor-pointer"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200 group-hover:border-[#5c2d7e] transition-colors"
        style={{ color: "#9ca3af" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#5c2d7e] transition-colors">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <div className="text-center px-4">
        <p className="text-sm font-bold text-gray-600 group-hover:text-[#5c2d7e] transition-colors">Agregar equipo</p>
        <p className="text-xs text-gray-400 mt-0.5">Publica un nuevo item en tu catalogo</p>
      </div>
    </button>
  );
}

// ── Main CatalogClient ─────────────────────────────────────────────────────────

export default function CatalogClient({ listings: initial }: { listings: Listing[] }) {
  const [listings, setListings]         = useState(initial);
  const [loadingId, setLoadingId]       = useState<string | null>(null);
  const [, startTransition]             = useTransition();
  const [showModal, setShowModal]       = useState(false);
  const [activeTab, setActiveTab]       = useState<"equipos" | "paquetes">("equipos");
  const [search, setSearch]             = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // ── Derived stats
  const totalItems    = listings.length;
  const published     = listings.filter((l) => l.is_published).length;
  const drafts        = listings.filter((l) => !l.is_published).length;

  // ── Client-side filter
  const filtered = listings.filter((l) => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      (l.title ?? "").toLowerCase().includes(term) ||
      (l.brand ?? "").toLowerCase().includes(term) ||
      (l.model ?? "").toLowerCase().includes(term);
    const matchCat = filterCategory === "all" || l.category === filterCategory;
    return matchSearch && matchCat;
  });

  // ── Handlers (optimistic UI)
  const handleToggle = (id: string, current: boolean) => {
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, is_published: !current } : l));
    setLoadingId(id);
    startTransition(async () => {
      const result = await togglePublish(id, current);
      if (result.error) {
        // Rollback
        setListings((prev) => prev.map((l) => l.id === id ? { ...l, is_published: current } : l));
      }
      setLoadingId(null);
    });
  };

  const handleDelete = (id: string, title: string | null) => {
    if (!confirm(`Confirmas que deseas eliminar "${title ?? "este equipo"}"? Esta accion es irreversible.`)) return;
    setLoadingId(id);
    startTransition(async () => {
      const result = await deleteListing(id);
      if (!result.error) setListings((prev) => prev.filter((l) => l.id !== id));
      setLoadingId(null);
    });
  };

  const clearFilters = () => { setSearch(""); setFilterCategory("all"); };

  return (
    <>
      {showModal && <CreateEquipmentModal onClose={() => setShowModal(false)} />}

      <div className="space-y-7">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mi catalogo</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestiona los equipos y paquetes que ofreces en ArtRider
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: BRAND.main }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo equipo
          </button>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total de items"
            value={totalItems}
            sub={`${published} publicados · ${drafts} borradores`}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.main} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            }
          />
          <StatCard
            label="Equipos activos"
            value={published}
            sub="Visibles en el catalogo"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.main} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            }
          />
          <StatCard
            label="Paquetes creados"
            value={0}
            sub="Proximamente disponible"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.main} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
            }
          />
        </div>

        {/* ── Tabs + Toolbar ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
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
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                    activeTab === tab
                      ? "text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                  style={activeTab === tab ? { background: BRAND.main } : undefined}
                >
                  {tab === "equipos" ? listings.length : 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Category filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, marca..."
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5c2d7e] focus:border-transparent transition-all"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5c2d7e] focus:border-transparent transition-all"
            >
              <option value="all">Todas las categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Content panel ───────────────────────────────────────────────── */}
        {activeTab === "equipos" ? (
          <>
            {/* Results meta */}
            {(search || filterCategory !== "all") && (
              <div className="flex items-center justify-between -mt-3">
                <p className="text-sm text-gray-500">
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
                </p>
                <button onClick={clearFilters} className="text-xs font-semibold text-[#5c2d7e] hover:underline">
                  Limpiar filtros
                </button>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AddNewCard onClick={() => setShowModal(true)} />
              {filtered.map((listing) => (
                <EquipmentCard
                  key={listing.id}
                  listing={listing}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  loadingId={loadingId}
                />
              ))}
            </div>

            {/* Empty state — filters returned nothing on existing data */}
            {listings.length > 0 && filtered.length === 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl py-16 flex flex-col items-center gap-3 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p className="text-base font-semibold text-gray-700">Sin resultados para tu busqueda</p>
                <p className="text-sm text-gray-400">Prueba con otros terminos o cambia el filtro de categoria.</p>
                <button onClick={clearFilters} className="mt-1 text-sm font-semibold text-[#5c2d7e] hover:underline">
                  Ver todos los equipos
                </button>
              </div>
            )}
          </>
        ) : (
          /* Packages — coming soon */
          <div className="bg-white border border-gray-100 rounded-2xl py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: BRAND.tint }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BRAND.main} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-gray-800">La funcion de paquetes llega pronto</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                Podras agrupar equipos en paquetes y ofrecerlos como combo a tus clientes.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
