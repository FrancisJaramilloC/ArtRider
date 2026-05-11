"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/services/listingsService";
import { togglePublish, deleteListing, createListing } from "@/services/listingsService";
import type { Package } from "@/services/packagesService";
import { createPackage } from "@/services/packagesService";

// ── Constants ──────────────────────────────────────────────────────────────────

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

// ── Shared styles ──────────────────────────────────────────────────────────────

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

// ── Pure helpers ───────────────────────────────────────────────────────────────

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ── Shared UI atoms ────────────────────────────────────────────────────────────

function ModalShell({
  title,
  subtitle,
  formId,
  submitLabel,
  pending,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  formId: string;
  submitLabel: string;
  pending: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-8 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose} className={`${cls.btnSecondary} flex-1`}>Cancelar</button>
          <button type="submit" form={formId} disabled={pending} className={`${cls.btnPrimary} flex-1`}>
            {pending ? "Guardando..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoUpload({ name, previewUrl, onFile }: {
  name: string;
  previewUrl: string | null;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className={cls.label}>Foto <span className="text-red-500">*</span></label>
      <div onClick={() => ref.current?.click()}
        className="relative h-44 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-gray-900 hover:bg-gray-50 transition-all overflow-hidden group">
        {previewUrl ? (
          <>
            <Image src={previewUrl} alt="Preview" fill className="object-cover" />
            <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
              Cambiar imagen
            </span>
          </>
        ) : (
          <div className="text-center text-gray-400 group-hover:text-gray-700 transition-colors">
            <svg className="mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="text-sm font-medium">Seleccionar foto</p>
            <p className="text-xs mt-0.5">JPG, PNG o WebP — max 5 MB</p>
          </div>
        )}
      </div>
      <input ref={ref} type="file" name={name} accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
    </div>
  );
}

function PublishToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${value ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white"}`}>
      <div className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${value ? "bg-gray-900" : "bg-gray-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? "translate-x-4" : ""}`} />
      </div>
      <input type="hidden" name="publishNow" value={String(value)} />
      <div>
        <p className="text-sm font-semibold text-gray-900">{value ? "Publicar ahora" : "Guardar como borrador"}</p>
        <p className="text-xs text-gray-400">{value ? "Visible para clientes de inmediato." : "Solo tu puedes verlo. Puedes publicarlo despues."}</p>
      </div>
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{message}</p>
  );
}

// ── Create Equipment Modal ─────────────────────────────────────────────────────

function CreateEquipmentModal({ onClose }: { onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview]      = useState<string | null>(null);
  const [publish, setPublish]      = useState(true);
  const [error, setError]          = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Maximo 5 MB."); e.target.value = ""; return; }
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("publishNow", String(publish));
    setError(null);
    startTransition(async () => {
      const res = await createListing(null, fd);
      if (res?.error) { setError(res.error); return; }
      onClose();
      window.location.reload();
    });
  }

  return (
    <ModalShell
      title="Nuevo equipo"
      subtitle="Completa la informacion de tu equipo"
      formId="eq-form"
      submitLabel="Guardar equipo"
      pending={pending}
      onClose={onClose}
    >
      <form ref={formRef} id="eq-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        {error && <ErrorBanner message={error} />}

        <PhotoUpload name="coverImage" previewUrl={preview} onFile={handleFile} />

        <div>
          <label htmlFor="eq-title" className={cls.label}>Nombre <span className="text-red-500">*</span></label>
          <input id="eq-title" name="title" type="text" required minLength={3} maxLength={100}
            placeholder="Ej: Parlante profesional 1000W" className={cls.input} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="eq-brand" className={cls.label}>Marca</label>
            <input id="eq-brand" name="brand" type="text" maxLength={60} placeholder="JBL" className={cls.input} />
          </div>
          <div>
            <label htmlFor="eq-model" className={cls.label}>Modelo</label>
            <input id="eq-model" name="model" type="text" maxLength={60} placeholder="EON615" className={cls.input} />
          </div>
        </div>

        <div>
          <label className={cls.label}>Categoria <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <label key={cat.value}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer text-sm font-medium text-gray-700 hover:border-gray-900 transition-all has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-white">
                <input type="radio" name="category" value={cat.value} required className="sr-only" />
                {cat.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="eq-price" className={cls.label}>Precio / dia (USD) <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 text-sm select-none">$</span>
            <input id="eq-price" name="dailyPrice" type="number" required min="1" step="0.01" placeholder="0.00"
              className={`${cls.input} pl-8`} />
          </div>
        </div>

        <div>
          <label htmlFor="eq-desc" className={cls.label}>
            Descripcion <span className="font-normal normal-case text-gray-400">(opcional)</span>
          </label>
          <textarea id="eq-desc" name="description" rows={3} maxLength={1000}
            placeholder="Estado del equipo, que incluye, condiciones de alquiler..."
            className={`${cls.input} resize-none`} />
        </div>

        <PublishToggle value={publish} onChange={setPublish} />
      </form>
    </ModalShell>
  );
}

// ── Equipment selector popup (inside package modal) ────────────────────────────

function EquipmentSelectorPopup({
  publishedListings,
  selected,
  onToggle,
  onClose,
}: {
  publishedListings: Listing[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = publishedListings.filter((l) =>
    !search || (l.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[70vh]">
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-8 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">Seleccionar equipos</p>
            <p className="text-xs text-gray-400 mt-0.5">{selected.size} seleccionado{selected.size !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all" />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 pb-3 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Sin equipos publicados que coincidan.</p>
          ) : (
            filtered.map((listing) => {
              const isSelected = selected.has(listing.id);
              return (
                <button key={listing.id} type="button" onClick={() => onToggle(listing.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isSelected ? "bg-gray-100 border border-gray-900" : "hover:bg-gray-50 border border-transparent"}`}>
                  {/* Thumbnail */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {listing.cover_image_url ? (
                      <Image src={listing.cover_image_url} alt={listing.title ?? "Equipo"} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{listing.title ?? "Sin titulo"}</p>
                    <p className="text-xs text-gray-400">{formatPrice(listing.daily_price)} / dia</p>
                  </div>

                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "border-gray-900 bg-gray-900" : "border-gray-300"}`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Confirm */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className={`${cls.btnPrimary} w-full`}>
            Confirmar seleccion ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Package Modal ───────────────────────────────────────────────────────

function CreatePackageModal({
  publishedListings,
  onClose,
}: {
  publishedListings: Listing[];
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [publish, setPublish]            = useState(true);
  const [error, setError]                = useState<string | null>(null);
  const [pending, startTransition]       = useTransition();
  const [selectedIds, setSelectedIds]    = useState<Set<string>>(new Set());
  const [showSelector, setShowSelector]  = useState(false);

  const selectedListings = publishedListings.filter((l) => selectedIds.has(l.id));

  function toggleListing(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function removeListing(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    if (selectedIds.size < 2) { setError("Agrega al menos 2 equipos al paquete."); return; }
    const fd = new FormData(formRef.current);
    fd.set("publishNow", String(publish));
    selectedIds.forEach((id) => fd.append("listingIds", id));
    setError(null);
    startTransition(async () => {
      const res = await createPackage(null, fd);
      if (res?.error) { setError(res.error); return; }
      onClose();
      window.location.reload();
    });
  }

  return (
    <>
      {showSelector && (
        <EquipmentSelectorPopup
          publishedListings={publishedListings}
          selected={selectedIds}
          onToggle={toggleListing}
          onClose={() => setShowSelector(false)}
        />
      )}

      <ModalShell
        title="Nuevo paquete"
        subtitle="Agrupa equipos publicados para ofrecerlos juntos"
        formId="pkg-form"
        submitLabel="Crear paquete"
        pending={pending}
        onClose={onClose}
      >
        <form ref={formRef} id="pkg-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && <ErrorBanner message={error} />}

          {/* Title */}
          <div>
            <label htmlFor="pkg-title" className={cls.label}>Titulo del paquete <span className="text-red-500">*</span></label>
            <input id="pkg-title" name="title" type="text" required minLength={3} maxLength={100}
              placeholder="Ej: Paquete Fiesta Premium" className={cls.input} />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="pkg-desc" className={cls.label}>
              Descripcion <span className="font-normal normal-case text-gray-400">(opcional)</span>
            </label>
            <textarea id="pkg-desc" name="description" rows={3} maxLength={1000}
              placeholder="Describe que incluye este paquete y para que tipo de eventos es ideal..."
              className={`${cls.input} resize-none`} />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="pkg-price" className={cls.label}>Precio por dia (USD) <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 text-sm select-none">$</span>
              <input id="pkg-price" name="dailyPrice" type="number" required min="1" step="0.01" placeholder="0.00"
                className={`${cls.input} pl-8`} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Precio total del paquete. Suma de equipos incluidos:{" "}
              <span className="font-semibold text-gray-700">
                {formatPrice(selectedListings.reduce((sum, l) => sum + l.daily_price, 0))}
              </span>
            </p>
          </div>

          {/* Equipment selection ───────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`${cls.label} mb-0`}>
                Equipos incluidos <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">Minimo 2</span>
            </div>

            {/* Selected list */}
            {selectedListings.length > 0 ? (
              <div className="space-y-2 mb-3">
                {selectedListings.map((l) => (
                  <div key={l.id}
                    className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                      {l.cover_image_url ? (
                        <Image src={l.cover_image_url} alt={l.title ?? ""} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{l.title ?? "Sin titulo"}</p>
                      <p className="text-[11px] text-gray-400">{formatPrice(l.daily_price)} / dia</p>
                    </div>
                    <button type="button" onClick={() => removeListing(l.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl py-8 text-center mb-3">
                <p className="text-sm text-gray-400">No hay equipos seleccionados</p>
                <p className="text-xs text-gray-300 mt-0.5">Agrega al menos 2 equipos publicados</p>
              </div>
            )}

            {/* Add button */}
            {publishedListings.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 font-medium">
                No tienes equipos publicados. Publica al menos 2 equipos antes de crear un paquete.
              </p>
            ) : (
              <button type="button" onClick={() => setShowSelector(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-gray-900 hover:text-gray-900 text-gray-500 text-sm font-semibold py-2.5 rounded-xl transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Agregar equipos
              </button>
            )}
          </div>

          <PublishToggle value={publish} onChange={setPublish} />
        </form>
      </ModalShell>
    </>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, hint, accent = false }: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl px-5 py-5 border transition-shadow hover:shadow-md ${accent ? "bg-white border-l-4 border-l-gray-900 border-gray-100" : "bg-white border-gray-100"}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest mb-1 text-gray-400">{label}</p>
      <p className="text-3xl font-black leading-none text-gray-900">{value}</p>
      {hint && <p className="text-xs mt-2 text-gray-400">{hint}</p>}
    </div>
  );
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  return (
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
      {CATEGORY_MAP[category] ?? category}
    </span>
  );
}

// ── Equipment Card ─────────────────────────────────────────────────────────────

function EquipmentCard({ listing, onToggle, onDelete }: {
  listing: Listing;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string, title: string | null) => void;
}) {
  return (
    <article className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative h-48 bg-gray-50 shrink-0">
        {listing.cover_image_url ? (
          <Image src={listing.cover_image_url} alt={listing.title ?? "Equipo"} fill className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${listing.is_published ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
          {listing.is_published ? "Activo" : "Borrador"}
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-1">
        <CategoryBadge category={listing.category} />
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mt-1">
          {listing.title ?? "Sin titulo"}
        </h3>
        {listing.brand && (
          <p className="text-xs text-gray-400">{listing.brand}{listing.model ? ` · ${listing.model}` : ""}</p>
        )}
        <p className="text-xl font-black text-gray-900 mt-auto pt-3">
          {formatPrice(listing.daily_price)}
          <span className="text-xs font-normal text-gray-400 ml-1">/ dia</span>
        </p>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <Link href={`/provider/catalog/${listing.id}/edit`}
          className="text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors">
          Editar
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => onToggle(listing.id, listing.is_published)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            {listing.is_published ? "Ocultar" : "Publicar"}
          </button>
          <button onClick={() => onDelete(listing.id, listing.title)}
            className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}

function AddNewCard({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 min-h-[280px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all group">
      <div className="w-12 h-12 rounded-full border-2 border-gray-200 group-hover:border-gray-900 group-hover:bg-gray-900 flex items-center justify-center transition-all">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-gray-400 group-hover:text-white transition-colors">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <div className="text-center px-4">
        <p className="text-sm font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      </div>
    </button>
  );
}

// ── Package Card ───────────────────────────────────────────────────────────────

function PackageCard({ pkg, itemCount }: { pkg: Package; itemCount: number }) {
  return (
    <article className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative h-48 bg-gray-50 shrink-0 flex items-center justify-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
        </div>
        <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${pkg.is_published ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
          {pkg.is_published ? "Activo" : "Borrador"}
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full w-fit">
          {itemCount} equipo{itemCount !== 1 ? "s" : ""}
        </span>
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mt-1">{pkg.title}</h3>
        {pkg.description && <p className="text-xs text-gray-400 line-clamp-2">{pkg.description}</p>}
        <p className="text-xl font-black text-gray-900 mt-auto pt-3">
          {formatPrice(pkg.daily_price)}
          <span className="text-xs font-normal text-gray-400 ml-1">/ dia</span>
        </p>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">Paquete</span>
        <div className="flex items-center gap-3">
          <button className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            {pkg.is_published ? "Ocultar" : "Publicar"}
          </button>
          <button className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function CatalogClient({
  listings: initial,
  packages: initialPackages,
}: {
  listings: Listing[];
  packages: Package[];
}) {
  const [listings, setListings]             = useState(initial);
  const [packages]                          = useState(initialPackages);
  const [loadingId, setLoadingId]           = useState<string | null>(null);
  const [, startTransition]                 = useTransition();
  const [activeModal, setActiveModal]       = useState<"equipment" | "package" | null>(null);
  const [activeTab, setActiveTab]           = useState<"equipos" | "paquetes">("equipos");
  const [search, setSearch]                 = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const published        = listings.filter((l) => l.is_published).length;
  const drafts           = listings.filter((l) => !l.is_published).length;
  const publishedListings = listings.filter((l) => l.is_published);

  const filtered = listings.filter((l) => {
    const term = search.toLowerCase();
    const matchSearch = !term || [l.title, l.brand, l.model].some((v) => v?.toLowerCase().includes(term));
    const matchCat    = filterCategory === "all" || l.category === filterCategory;
    return matchSearch && matchCat;
  });

  const hasFilters = Boolean(search) || filterCategory !== "all";

  function handleToggle(id: string, current: boolean) {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_published: !current } : l)));
    setLoadingId(id);
    startTransition(async () => {
      const res = await togglePublish(id, current);
      if (res.error) setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_published: current } : l)));
      setLoadingId(null);
    });
  }

  function handleDelete(id: string, title: string | null) {
    if (!confirm(`Eliminar "${title ?? "este equipo"}"? Esta accion es irreversible.`)) return;
    setLoadingId(id);
    startTransition(async () => {
      const res = await deleteListing(id);
      if (!res.error) setListings((prev) => prev.filter((l) => l.id !== id));
      setLoadingId(null);
    });
  }

  const clearFilters = () => { setSearch(""); setFilterCategory("all"); };

  return (
    <>
      {activeModal === "equipment" && (
        <CreateEquipmentModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "package" && (
        <CreatePackageModal
          publishedListings={publishedListings}
          onClose={() => setActiveModal(null)}
        />
      )}

      <div className="space-y-8">

        {/* Hero header */}
        <div className="rounded-2xl bg-white border border-gray-200 px-7 py-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Panel de proveedor</p>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mi catálogo</h1>
              <p className="text-sm text-gray-500 mt-1">
                {listings.length} equipo{listings.length !== 1 ? "s" : ""} registrado{listings.length !== 1 ? "s" : ""}
                {drafts > 0 && (
                  <span className="ml-2 bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    {drafts} {drafts === 1 ? "borrador" : "borradores"}
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => setActiveModal("equipment")} className={cls.btnPrimary}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo equipo
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total de items"   value={listings.length} hint={`${published} activos · ${drafts} borradores`} accent />
          <StatCard label="Equipos activos"  value={published}       hint="Visibles en el catalogo publico" />
          <StatCard label="Paquetes creados" value={packages.length} hint={packages.length === 0 ? "Crea tu primer paquete" : `${packages.filter(p => p.is_published).length} publicados`} />
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

        {/* Content */}
        {activeTab === "equipos" ? (
          <div className="space-y-3">
            {hasFilters && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
                <button onClick={clearFilters}
                  className="text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors">
                  Limpiar filtros
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AddNewCard label="Agregar equipo" hint="Publica un nuevo item en tu catalogo" onClick={() => setActiveModal("equipment")} />
              {filtered.map((listing) => (
                <div key={listing.id} className={loadingId === listing.id ? "opacity-40 pointer-events-none" : ""}>
                  <EquipmentCard listing={listing} onToggle={handleToggle} onDelete={handleDelete} />
                </div>
              ))}
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AddNewCard
                label="Crear paquete"
                hint={publishedListings.length < 2 ? "Necesitas al menos 2 equipos publicados" : "Agrupa equipos para ofrecerlos juntos"}
                onClick={() => setActiveModal("package")}
              />
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} itemCount={pkg.items?.length ?? 0} />
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
    </>
  );
}
