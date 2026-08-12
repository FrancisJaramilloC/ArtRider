"use client";

import React, { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  Search,
  X,
  Package,
} from "lucide-react";
import type { Listing } from "@/services/listingsService";
import { createPackage, updatePackage } from "@/services/packagesService";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const STEPS = ["Información", "Portada", "Equipos", "Precio"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardData = {
  title: string;
  description: string;
  dailyPrice: string;
  capacityPeople: string;
  publishNow: boolean;
};

type StepErrors = Partial<{
  title: string;
  cover: string;
  equipos: string;
  dailyPrice: string;
  capacityPeople: string;
}>;

/** Datos pre-rellenados para el modo edición */
export type PackageInitialData = {
  id: string;
  title: string;
  description: string;
  dailyPrice: string;
  capacityPeople: string;
  publishNow: boolean;
  existingCoverUrl: string | null;
  selectedItems: { listingId: string; quantity: number }[];
};

export type PackageFormWizardProps = {
  publishedListings: Listing[];
  /** Si se provee, el wizard opera en modo edición (pre-rellena todo) */
  initialData?: PackageInitialData;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-base font-bold text-gray-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-red-500 mt-1.5">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {children}
    </p>
  );
}

function inputCx(hasError: boolean) {
  return `block w-full rounded-2xl border px-5 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm ${
    hasError
      ? "border-red-300 bg-red-50"
      : "border-gray-200 bg-gray-50 hover:border-gray-300"
  }`;
}

function ReviewRow({
  label,
  value,
  valueClass = "text-gray-800",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium max-w-[55%] text-right truncate ${valueClass}`}>
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}

// ─── Root wizard ──────────────────────────────────────────────────────────────

export default function PackageFormWizard({ publishedListings, initialData }: PackageFormWizardProps) {
  const router  = useRouter();
  const isEdit  = !!initialData?.id;

  const [step, setStep]           = useState(1);
  const [errors, setErrors]       = useState<StepErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition]    = useTransition();

  // Equipos seleccionados y sus cantidades — pre-rellenados en modo edición
  const [selectedMap, setSelectedMap] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    initialData?.selectedItems?.forEach((item) => {
      map.set(item.listingId, item.quantity);
    });
    return map;
  });
  // Conflicto geográfico (distintas provincias)
  const [geoConflict, setGeoConflict] = useState<string | null>(null);

  // Foto de portada
  const [coverFile, setCoverFile]         = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  /** URL de portada existente (modo edición) */
  const [existingCoverUrl]                = useState<string | null>(initialData?.existingCoverUrl ?? null);

  // Galería adicional (hasta 5 fotos opcionales)
  const [galleryFiles, setGalleryFiles]     = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Datos del formulario — pre-rellenados en modo edición
  const [data, setData] = useState<WizardData>(() => ({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    dailyPrice: initialData?.dailyPrice ?? "",
    capacityPeople: initialData?.capacityPeople ?? "",
    publishNow: initialData?.publishNow ?? true,
  }));

  const update = (patch: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const selectedListings = publishedListings.filter((l) => selectedMap.has(l.id));

  const toggleListing = (id: string) => {
    const isAdding = !selectedMap.has(id);

    if (isAdding) {
      // ── Validación geográfica: no mezclar provincias distintas ──────────────
      const target = publishedListings.find((l) => l.id === id);
      const targetState = target?.address?.state;

      if (targetState) {
        const existingStates = [...selectedMap.keys()]
          .map((sid) => publishedListings.find((l) => l.id === sid)?.address?.state)
          .filter((s): s is string => !!s);

        if (existingStates.length > 0 && !existingStates.includes(targetState)) {
          const conflictState = existingStates[0];
          setGeoConflict(
            `"${target!.title ?? "Este equipo"}" está en ${targetState}, pero los equipos ya seleccionados están en ${conflictState}. No puedes combinar equipos de distintas provincias en un mismo paquete.`
          );
          return; // bloquear adición
        }
      }
      setGeoConflict(null);
    } else {
      setGeoConflict(null);
    }

    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, 1); // Empezar con cantidad 1
      }
      return next;
    });
    setErrors((e) => ({ ...e, equipos: undefined }));
  };

  const updateListingQuantity = (id: string, qty: number, maxStock: number) => {
    if (qty < 1 || qty > maxStock) return;
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.set(id, qty);
      return next;
    });
  };

  const removeListing = (id: string) => {
    setGeoConflict(null);
    setSelectedMap((prev) => { const n = new Map(prev); n.delete(id); return n; });
  };

  // ── Cover file handler ──────────────────────────────────────────────────────

  const handleCoverFile = (file: File | null) => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    if (!file) { setCoverFile(null); setCoverPreviewUrl(null); return; }
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setErrors((e) => ({ ...e, cover: undefined }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateStep = (s: number): StepErrors => {
    const e: StepErrors = {};
    if (s === 1) {
      const t = data.title.trim();
      if (!t || t.length < 3) e.title = "El título debe tener al menos 3 caracteres.";
      else if (t.length > 100) e.title = "El título no puede superar 100 caracteres.";
      
      if (data.capacityPeople.trim() && (isNaN(Number(data.capacityPeople)) || Number(data.capacityPeople) < 1)) {
        e.capacityPeople = "La cantidad de personas debe ser un número válido mayor a 0.";
      }
    }
    if (s === 2 && !coverFile && !existingCoverUrl) {
      e.cover = "La foto de portada es obligatoria.";
    }
    if (s === 3 && selectedMap.size < 2) {
      e.equipos = "Selecciona mínimo 2 equipos para continuar.";
    }
    if (s === 4) {
      const price = parseFloat(data.dailyPrice);
      if (isNaN(price) || price < 1) e.dailyPrice = "El precio mínimo es $1.00 por día.";
      else if (price > 10000) e.dailyPrice = "El precio máximo es $10,000 por día.";
    }
    return e;
  };

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    const e = validateStep(TOTAL_STEPS);
    if (Object.keys(e).length) { setErrors(e); return; }

    const fd = new FormData();
    fd.append("title", data.title.trim());
    fd.append("description", data.description.trim());
    fd.append("dailyPrice", data.dailyPrice);
    if (data.capacityPeople.trim()) {
      fd.append("capacityPeople", data.capacityPeople.trim());
    }
    fd.append("publishNow", String(data.publishNow));
    if (coverFile) fd.append("coverImage", coverFile);
    galleryFiles.forEach((f) => fd.append("galleryImages", f));
    selectedMap.forEach((qty, id) => {
      fd.append("listingIds", id);
      fd.append("listingQuantities", String(qty));
    });

    setServerError(null);
    startTransition(async () => {
      const res = isEdit
        ? await updatePackage(initialData!.id, null, fd)
        : await createPackage(null, fd);
      if (res?.error) { setServerError(res.error); return; }
      router.push("/provider/catalog");
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLastStep = step === TOTAL_STEPS;
  const progress   = (step / TOTAL_STEPS) * 100;

  return (
    <div className="relative">
      {/* Barra de progreso */}
      <div className="h-0.5 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-[#875B9A] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Badge de paso */}
      <div className="flex items-center gap-2.5 mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#875B9A] bg-[#875B9A]/8 rounded-full px-3 py-1.5">
          Paso {step} de {TOTAL_STEPS}
        </span>
        <span className="text-xs text-gray-400 font-medium">{STEPS[step - 1]}</span>
      </div>

      {/* Contenido del paso */}
      <div className="pb-28">
        {step === 1 && (
          <StepInfo data={data} update={update} errors={errors} />
        )}
        {step === 2 && (
          <StepPortada
            coverFile={coverFile}
            coverPreviewUrl={coverPreviewUrl}
            existingCoverUrl={existingCoverUrl}
            onFile={handleCoverFile}
            error={errors.cover}
            galleryPreviews={galleryPreviews}
            onGalleryFiles={(files) => {
              galleryPreviews.forEach((u) => URL.revokeObjectURL(u));
              setGalleryFiles(files);
              setGalleryPreviews(files.map((f) => URL.createObjectURL(f)));
            }}
            onClearGallery={() => {
              galleryPreviews.forEach((u) => URL.revokeObjectURL(u));
              setGalleryFiles([]);
              setGalleryPreviews([]);
            }}
          />
        )}
        {step === 3 && (
          <>
            <input type="hidden" name="publishNow"  value={String(data.publishNow)} />

            {Array.from(selectedMap.entries()).map(([id, qty]) => (
              <React.Fragment key={id}>
                <input type="hidden" name="listingIds" value={id} />
                <input type="hidden" name="listingQuantities" value={qty} />
              </React.Fragment>
            ))}

            <StepEquipment
              publishedListings={publishedListings}
              selectedMap={selectedMap}
              selectedListings={selectedListings}
              onToggle={toggleListing}
              onUpdateQuantity={updateListingQuantity}
              onRemove={removeListing}
              errors={errors}
              geoConflict={geoConflict}
            />
          </>
        )}
        {step === 4 && (
          <StepPrecio
            data={data}
            update={update}
            errors={errors}
            serverError={serverError}
            selectedListings={selectedListings}
            selectedMap={selectedMap}
          />
        )}
      </div>

      {/* Bottom nav fija — misma offset que el wizard de equipos */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-white border-t border-gray-100 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">

          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            Atrás
          </button>

          {/* Dots — mismos estilos que ListingFormWizard */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i + 1 === step
                    ? "w-5 h-2 bg-[#875B9A]"
                    : i + 1 < step
                    ? "w-2 h-2 bg-[#875B9A]/40"
                    : "w-2 h-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#875B9A] hover:bg-[#6a437a] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? "Guardando..." : "Creando paquete..."}</>
              ) : (
                isEdit ? "Guardar cambios" : "Crear paquete"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#875B9A] hover:bg-[#6a437a] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Paso 1: Información ────────────────────────────────────────────────────────

function StepInfo({
  data,
  update,
  errors,
}: {
  data: WizardData;
  update: (p: Partial<WizardData>) => void;
  errors: StepErrors;
}) {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight">
          Crea tu paquete
        </h1>
        <p className="text-gray-500 text-base">
          Un paquete agrupa varios equipos que ofreces juntos.
          Dale un nombre que tus clientes reconozcan al instante.
        </p>
      </div>

      <Field label="Nombre del paquete" required error={errors.title}>
        <input
          type="text"
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          maxLength={100}
          placeholder="Ej: Pack Sonido & Iluminación Premium"
          className={inputCx(!!errors.title)}
          autoFocus
        />
        <div className="flex justify-between items-start">
          {errors.title ? <ErrorMsg>{errors.title}</ErrorMsg> : <span />}
          <span className="text-xs text-gray-400 shrink-0 ml-2">{data.title.length}/100</span>
        </div>
      </Field>

      <Field
        label="Descripción"
        hint="Describe qué incluye y para qué tipo de eventos es ideal."
      >
        <textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={4}
          maxLength={1000}
          placeholder="Ej: Ideal para fiestas de hasta 200 personas. Incluye parlantes, micrófono inalámbrico, luces PAR y máquina de humo..."
          className={`${inputCx(false)} resize-none`}
        />
        <p className="text-xs text-gray-400 text-right">{data.description.length}/1000</p>
      </Field>

      <Field 
        label="Capacidad (Personas)" 
        hint="Opcional. Cantidad máxima de personas que cubre este paquete."
        error={errors.capacityPeople}
      >
        <input
          type="number"
          min="1"
          value={data.capacityPeople}
          onChange={(e) => update({ capacityPeople: e.target.value })}
          onWheel={(e) => e.currentTarget.blur()}
          placeholder="Ej: 50"
          className={inputCx(!!errors.capacityPeople)}
        />
        {errors.capacityPeople && (
          <div className="mt-1">
            <ErrorMsg>{errors.capacityPeople}</ErrorMsg>
          </div>
        )}
      </Field>
    </div>
  );
}

// ─── Paso 2: Portada + Galería ────────────────────────────────────────────────

function StepPortada({
  coverFile,
  coverPreviewUrl,
  existingCoverUrl,
  onFile,
  error,
  galleryPreviews,
  onGalleryFiles,
  onClearGallery,
}: {
  coverFile: File | null;
  coverPreviewUrl: string | null;
  existingCoverUrl?: string | null;
  onFile: (f: File | null) => void;
  error?: string;
  galleryPreviews: string[];
  onGalleryFiles: (files: File[]) => void;
  onClearGallery: () => void;
}) {
  const coverInputRef   = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // El preview a mostrar: nuevo blob > URL existente > nada
  const displayUrl = coverPreviewUrl ?? existingCoverUrl ?? null;

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 5 * 1024 * 1024) { onFile(null); return; }
    onFile(f);
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5)
      .filter((f) => f.size <= 5 * 1024 * 1024);
    onGalleryFiles(files);
  };

  const MAX_GALLERY = 5;
  const gallerySlots = Array.from({ length: MAX_GALLERY }, (_, i) => galleryPreviews[i] ?? null);

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight">
          Fotos del paquete
        </h1>
        <p className="text-gray-500 text-base">
          La portada es obligatoria. Añade hasta 5 fotos adicionales para mostrar los equipos incluidos.
        </p>
      </div>

      {/* ── Portada (obligatoria) ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
          Portada <span className="text-red-400">*</span>
        </p>
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className={[
            "relative w-full rounded-3xl border-2 border-dashed overflow-hidden transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A]",
            error
              ? "border-red-300 bg-red-50"
              : displayUrl
              ? "border-[#875B9A]/30 bg-white"
              : "border-gray-200 bg-gray-50 hover:border-[#875B9A]/50 hover:bg-[#875B9A]/4",
          ].join(" ")}
          aria-label="Seleccionar foto de portada"
        >
          {displayUrl ? (
            <div className="relative aspect-[3/2] w-full">
              <Image
                src={displayUrl}
                alt="Portada del paquete"
                fill
                sizes="(max-width: 1024px) 100vw, 512px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-colors flex items-center justify-center group">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-semibold bg-black/40 px-4 py-2 rounded-xl">
                  Cambiar portada
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Portada obligatoria</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP · máx. 5 MB</p>
              </div>
            </div>
          )}
        </button>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleCoverChange}
        />

        {error && <ErrorMsg>{error}</ErrorMsg>}

        {coverFile && !error && (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 mt-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#875B9A]/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-[#875B9A]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{coverFile.name}</p>
                <p className="text-xs text-gray-400">{(coverFile.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFile(null); }}
              aria-label="Quitar portada"
              className="text-gray-400 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Galería adicional (hasta 5) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Fotos adicionales{" "}
            <span className="text-gray-300 font-normal normal-case tracking-normal">(opcionales, máx. 5)</span>
          </p>
          {galleryPreviews.length > 0 && (
            <button
              type="button"
              onClick={onClearGallery}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {gallerySlots.map((previewUrl, i) => (
            <div
              key={i}
              onClick={() => galleryInputRef.current?.click()}
              className={`relative aspect-square rounded-xl border-2 border-dashed overflow-hidden cursor-pointer group transition-all duration-200 ${
                previewUrl
                  ? "border-[#875B9A]/40"
                  : "border-gray-200 bg-gray-50 hover:border-[#875B9A]/40 hover:bg-[#875B9A]/3 flex items-center justify-center"
              }`}
            >
              {previewUrl ? (
                <>
                  <Image src={previewUrl} alt={`Foto ${i + 2}`} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 p-2 text-gray-300 group-hover:text-[#875B9A] transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span className="text-[9px] font-semibold">{i + 2}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          multiple
          onChange={handleGalleryChange}
        />
        <p className="text-xs text-gray-400 mt-2">
          {galleryPreviews.length > 0
            ? `${galleryPreviews.length} foto${galleryPreviews.length !== 1 ? "s" : ""} adicional${galleryPreviews.length !== 1 ? "es" : ""} seleccionada${galleryPreviews.length !== 1 ? "s" : ""}`
            : "Haz clic para agregar fotos de los equipos incluidos"}
        </p>
      </div>
    </div>
  );
}

// ─── Paso 3: Equipos ──────────────────────────────────────────────────────────

function StepEquipment({
  publishedListings,
  selectedMap,
  selectedListings,
  onToggle,
  onUpdateQuantity,
  onRemove,
  errors,
  geoConflict,
}: {
  publishedListings: Listing[];
  selectedMap: Map<string, number>;
  selectedListings: Listing[];
  onToggle: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number, maxStock: number) => void;
  onRemove: (id: string) => void;
  errors: StepErrors;
  geoConflict?: string | null;
}) {
  const [search, setSearch] = useState("");

  const filtered = publishedListings.filter(
    (l) =>
      !search ||
      [l.title, l.brand, l.model].some((v) =>
        v?.toLowerCase().includes(search.toLowerCase())
      )
  );

  const totalCents = selectedListings.reduce((sum, l) => {
    const qty = selectedMap.get(l.id) || 1;
    return sum + (l.daily_price * qty);
  }, 0);
  const hasEnough = selectedMap.size >= 2;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight">
          Elige los equipos
        </h1>
        <p className="text-gray-500 text-base">
          Selecciona al menos{" "}
          <strong className="text-gray-700">2 equipos publicados</strong>.
          Su suma de precios te servirá de guía para fijar el precio final del paquete.
        </p>
      </div>

      {/* Error de validación (mínimo 2 equipos) */}
      {errors.equipos && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">{errors.equipos}</p>
        </div>
      )}

      {/* Conflicto geográfico — provincias distintas */}
      {geoConflict && (
        <div className="flex items-start gap-3 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3.5">
          <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <p className="text-sm text-orange-700 font-medium leading-relaxed">{geoConflict}</p>
        </div>
      )}

      {/* Banner de seleccionados */}
      {selectedListings.length > 0 && (
        <div className="rounded-2xl border border-[#875B9A]/20 bg-[#875B9A]/4 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#875B9A] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {selectedListings.length}
            </span>
            <span className="text-sm font-semibold text-gray-800">
              equipo{selectedListings.length !== 1 ? "s" : ""} seleccionado{selectedListings.length !== 1 ? "s" : ""}
            </span>
            {!hasEnough && (
              <span className="text-xs text-amber-600 font-medium">
                · falta {2 - selectedMap.size} más
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">
              Suma de precios
            </p>
            <p className="text-base font-black text-gray-900">
              {fmtPrice(totalCents)}
              <span className="text-xs font-normal text-gray-400 ml-1">/ día</span>
            </p>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, marca o modelo..."
          className="block w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-10 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid de equipos */}
      {publishedListings.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Package className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-gray-600">Sin equipos publicados</p>
          <p className="text-sm text-gray-400 max-w-xs">
            Necesitas publicar al menos 2 equipos antes de crear un paquete.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">
          Sin resultados para &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((listing) => {
            const isSelected = selectedMap.has(listing.id);
            const qty = selectedMap.get(listing.id) || 1;
            const maxStock = listing.available_stock ?? 1;
            
            return (
              <div
                key={listing.id}
                className={`relative flex flex-col p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-[#875B9A] bg-[#875B9A]/4 shadow-sm"
                    : "border-gray-200 bg-white hover:border-[#875B9A]/30 hover:bg-gray-50 cursor-pointer"
                }`}
                onClick={(e) => {
                  // Prevenir toggle si se clickea dentro del control de cantidad
                  if (!isSelected) onToggle(listing.id);
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Check badge */}
                  {isSelected && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(listing.id);
                      }}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#875B9A] hover:bg-red-500 transition-colors flex items-center justify-center z-10"
                      title="Quitar equipo"
                    >
                      <X className="w-3 h-3 text-white" strokeWidth={3} />
                    </button>
                  )}

                  {/* Thumbnail */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {listing.cover_image_url ? (
                      <Image
                        src={listing.cover_image_url}
                        alt={listing.title ?? "Equipo"}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-300" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-[#875B9A]" : "text-gray-900"}`}>
                      {listing.title ?? "Sin título"}
                    </p>
                    {listing.brand && (
                      <p className="text-xs text-gray-400 truncate">
                        {listing.brand}{listing.model ? ` · ${listing.model}` : ""}
                      </p>
                    )}
                    <p className="text-sm font-black text-gray-900 mt-1">
                      {fmtPrice(listing.daily_price)}
                      <span className="text-xs font-normal text-gray-400 ml-1">/ día</span>
                    </p>
                  </div>
                </div>

                {/* Control de cantidad - Solo visible si está seleccionado */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-[#875B9A]/10 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-600">Cantidad:</span>
                      <span className="text-[10px] font-semibold text-[#875B9A] uppercase tracking-wider">
                        {maxStock} DISPONIBLE{maxStock !== 1 ? 'S' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button 
                        type="button" 
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        disabled={qty <= 1}
                        onClick={() => onUpdateQuantity(listing.id, qty - 1, maxStock)}
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{qty}</span>
                      <button 
                        type="button" 
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        disabled={qty >= maxStock}
                        onClick={() => onUpdateQuantity(listing.id, qty + 1, maxStock)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla resumen de seleccionados */}
      {selectedListings.length > 0 && (
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Equipos del paquete</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Precio / día</p>
          </div>
          <div className="divide-y divide-gray-100">
            {selectedListings.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {l.cover_image_url ? (
                    <Image
                      src={l.cover_image_url}
                      alt={l.title ?? ""}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                  {l.title ?? "Sin título"}
                  {(selectedMap.get(l.id) ?? 1) > 1 && (
                    <span className="text-xs text-gray-400 ml-1">×{selectedMap.get(l.id)}</span>
                  )}
                </p>
                <p className="text-sm font-semibold text-gray-900 shrink-0">{fmtPrice(l.daily_price * (selectedMap.get(l.id) ?? 1))}</p>
                <button
                  type="button"
                  onClick={() => onRemove(l.id)}
                  aria-label={`Quitar ${l.title}`}
                  className="text-gray-300 hover:text-red-400 transition-colors shrink-0 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {/* Total */}
          <div className="bg-gray-50 px-5 py-3.5 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">Total de equipos ({selectedListings.length})</p>
            <p className="text-base font-black text-gray-900">
              {fmtPrice(totalCents)}
              <span className="text-xs font-normal text-gray-400 ml-1">/ día</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Paso 3: Precio y Publicación ─────────────────────────────────────────────

function StepPrecio({
  data,
  update,
  errors,
  serverError,
  selectedListings,
  selectedMap,
}: {
  data: WizardData;
  update: (p: Partial<WizardData>) => void;
  errors: StepErrors;
  serverError: string | null;
  selectedListings: Listing[];
  selectedMap: Map<string, number>;
}) {
  const sumCents = selectedListings.reduce((s, l) => {
    const qty = selectedMap.get(l.id) ?? 1;
    return s + (l.daily_price * qty);
  }, 0);
  const inputCents = parseFloat(data.dailyPrice) * 100;
  const hasDiscount = !isNaN(inputCents) && inputCents > 0 && inputCents < sumCents;
  const discountPct = hasDiscount ? Math.round((1 - inputCents / sumCents) * 100) : 0;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight">
          Define el precio
        </h1>
        <p className="text-gray-500 text-base">
          Fija el precio diario del paquete completo. Puedes ofrecer un descuento
          frente a contratar los equipos por separado.
        </p>
      </div>

      {/* Referencia de precio */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-200">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
            Suma de equipos individuales
          </p>
          <p className="text-2xl font-black text-gray-300">
            {fmtPrice(sumCents)}
            <span className="text-sm font-normal text-gray-400 ml-1">/ día</span>
          </p>
        </div>
        {hasDiscount && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full whitespace-nowrap">
            -{discountPct}% descuento
          </span>
        )}
      </div>

      {/* Input de precio */}
      <Field label="Precio del paquete por día (USD)" required error={errors.dailyPrice}>
        <div className="relative flex items-center">
          <span className="absolute left-5 text-2xl font-semibold text-gray-300 select-none">$</span>
          <input
            type="number"
            value={data.dailyPrice}
            onChange={(e) => update({ dailyPrice: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            min="1"
            step="0.01"
            placeholder="0.00"
            className={`block w-full rounded-2xl border pl-12 pr-24 py-5 text-2xl font-semibold text-gray-900 placeholder:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all ${
              errors.dailyPrice ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
            }`}
          />
          <span className="absolute right-5 text-sm text-gray-400 font-medium whitespace-nowrap">
            USD / día
          </span>
        </div>
        {errors.dailyPrice && <ErrorMsg>{errors.dailyPrice}</ErrorMsg>}
      </Field>

      {/* Resumen del paquete */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Resumen del paquete
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          <ReviewRow label="Nombre" value={data.title} />
          <ReviewRow
            label="Equipos"
            value={`${selectedListings.length} equipo${selectedListings.length !== 1 ? "s" : ""}`}
          />
          {data.dailyPrice && (
            <ReviewRow
              label="Tu precio"
              value={`$${parseFloat(data.dailyPrice || "0").toFixed(2)} / día`}
              valueClass="font-bold text-[#875B9A]"
            />
          )}
          {hasDiscount && (
            <ReviewRow
              label="Ahorro para el cliente"
              value={`-${discountPct}% vs. precio individual`}
              valueClass="text-emerald-600 font-semibold"
            />
          )}
        </div>
      </div>

      {/* Toggle de publicación */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-200">
        <button
          type="button"
          role="switch"
          aria-checked={data.publishNow}
          onClick={() => update({ publishNow: !data.publishNow })}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            data.publishNow ? "bg-[#875B9A]" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              data.publishNow ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {data.publishNow ? "Publicar inmediatamente" : "Guardar como borrador"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.publishNow
              ? "El paquete será visible en el catálogo público al instante."
              : "Solo tú podrás verlo. Puedes publicarlo cuando quieras."}
          </p>
        </div>
      </div>

      {/* Error del servidor */}
      {serverError && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600 font-medium">{serverError}</p>
        </div>
      )}
    </div>
  );
}
