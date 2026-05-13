"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  Volume2, Zap, Video, Sparkles, Megaphone, Package,
  MapPin, ChevronLeft, ChevronRight, Loader2, Check,
  LocateFixed, Camera, X, AlertCircle,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;
const STEPS = ["Categoría", "Detalles", "Fotos", "Ubicación", "Precio"];

const CATEGORIES = [
  { value: "audio",       label: "Sonido",      Icon: Volume2,   desc: "Parlantes, micrófonos, consolas" },
  { value: "lighting",    label: "Iluminación",  Icon: Zap,       desc: "Luces, reflectores, cañones DMX" },
  { value: "video",       label: "Video",        Icon: Video,     desc: "Cámaras, proyectores, pantallas" },
  { value: "effects",     label: "Efectos",      Icon: Sparkles,  desc: "Humo, lásers, máquinas confetti" },
  { value: "advertising", label: "Publicidad",   Icon: Megaphone, desc: "Vallas, banners, displays LED" },
  { value: "other",       label: "Otro",         Icon: Package,   desc: "Equipos que no encajan arriba" },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardData = {
  category: string;
  title: string;
  brand: string;
  model: string;
  description: string;
  /** Object URL for UI preview only — the actual File lives in the DOM input inside the hidden form */
  previewUrl: string | null;
  dailyPrice: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  publishNow: boolean;
};

type StepErrors = Partial<Record<keyof WizardData | "imageFile", string>>;

export type Props = {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  serverError?: string | null;
};

// ── Root component ────────────────────────────────────────────────────────────

export default function ListingFormWizard({ formAction, isPending, serverError }: Props) {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<StepErrors>({});
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  /*
   * formRef — points to the hidden <form action={formAction}>.
   * requestSubmit() on this form is what actually triggers the Server Action,
   * letting the browser build a native multipart FormData that includes the File
   * object. Calling useActionState's dispatch(fd) programmatically goes through
   * React's serialization layer, which strips File objects → empty payload.
   */
  const formRef = useRef<HTMLFormElement>(null);

  /*
   * fileInputRef — the <input type="file"> lives inside the hidden form so the
   * browser automatically includes the selected File when the form is submitted
   * via requestSubmit(). The visible dropzone area in StepPhotos triggers a
   * click() on this ref to open the OS file picker.
   */
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<WizardData>({
    category: "",
    title: "",
    brand: "",
    model: "",
    description: "",
    previewUrl: null,
    dailyPrice: "",
    city: "",
    state: "",
    latitude: null,
    longitude: null,
    publishNow: false,
  });

  const update = (patch: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  // ── Per-step validation ─────────────────────────────────────────────────────

  const validateStep = (s: number): StepErrors => {
    const e: StepErrors = {};

    if (s === 1 && !data.category)
      e.category = "Selecciona una categoría para continuar.";

    if (s === 2) {
      const trimmed = data.title.trim();
      if (!trimmed || trimmed.length < 3)
        e.title = "El título debe tener al menos 3 caracteres.";
      else if (trimmed.length > 100)
        e.title = "El título no puede superar 100 caracteres.";
      if (!data.brand.trim())
        e.brand = "La marca es obligatoria.";
    }

    // Validate against previewUrl: a non-null URL means the DOM file input has a file
    if (s === 3 && !data.previewUrl)
      e.imageFile = "Debes subir al menos una foto del equipo.";

    if (s === 4) {
      if (!data.city.trim()) e.city = "La ciudad es obligatoria.";
      if (!data.state.trim()) e.state = "La provincia o estado es obligatorio.";
    }

    if (s === 5) {
      const price = parseFloat(data.dailyPrice);
      if (isNaN(price) || price < 1)
        e.dailyPrice = "El precio mínimo es $1.00 por día.";
      else if (price > 10000)
        e.dailyPrice = "El precio máximo es $10,000 por día.";
    }

    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Submit: triggers the hidden native form — NOT useActionState dispatch ────
  const handleSubmit = () => {
    const e = validateStep(5);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    // requestSubmit() fires the form's submit event → Next.js intercepts it →
    // builds multipart FormData from the DOM (hidden inputs + file input) →
    // calls the Server Action with a complete, file-inclusive payload.
    formRef.current?.requestSubmit();
  };

  // ── File handling ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5 MB.");
      e.target.value = "";
      return;
    }
    // Store only the object URL for UI preview; the File itself stays in the DOM input
    update({ previewUrl: URL.createObjectURL(file) });
  };

  const clearPhoto = () => {
    update({ previewUrl: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── GPS detection ─────────────────────────────────────────────────────────────
  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Permiso denegado. Actívalo en la configuración de tu navegador."
            : "No se pudo obtener tu ubicación. Intenta de nuevo."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const isLastStep = step === TOTAL_STEPS;
  const progress   = (step / TOTAL_STEPS) * 100;

  return (
    <div className="relative">
      {/*
        Hidden native <form> — the single source of truth for submission.

        All wizard state is mirrored into hidden inputs (controlled via value prop)
        so that when requestSubmit() fires, the browser builds the correct
        multipart/form-data body — including the File from fileInputRef.

        Why not use dispatch(fd) directly?
        useActionState's dispatch goes through React's action serialization,
        which converts FormData to a plain object, dropping all File entries.
        The native form submit path bypasses this and sends real multipart data.
      */}
      <form
        ref={formRef}
        action={formAction}
        className="hidden"
        aria-hidden="true"
      >
        {/* Text/scalar fields — React keeps DOM value in sync with wizard state */}
        <input type="hidden" name="title"       value={data.title}              onChange={() => {}} />
        <input type="hidden" name="brand"       value={data.brand}              onChange={() => {}} />
        <input type="hidden" name="model"       value={data.model}              onChange={() => {}} />
        <input type="hidden" name="category"    value={data.category}           onChange={() => {}} />
        <input type="hidden" name="dailyPrice"  value={data.dailyPrice}         onChange={() => {}} />
        <input type="hidden" name="description" value={data.description}        onChange={() => {}} />
        <input type="hidden" name="publishNow"  value={String(data.publishNow)} onChange={() => {}} />
        <input type="hidden" name="city"        value={data.city}               onChange={() => {}} />
        <input type="hidden" name="state"       value={data.state}              onChange={() => {}} />
        <input type="hidden" name="latitude"    value={data.latitude  ?? ""}    onChange={() => {}} />
        <input type="hidden" name="longitude"   value={data.longitude ?? ""}    onChange={() => {}} />

        {/* File input — must live here so the browser includes the File in FormData */}
        <input
          ref={fileInputRef}
          type="file"
          name="coverImage"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
      </form>

      {/* ── Thin progress bar ── */}
      <div className="h-0.5 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-[#875B9A] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Step badge ── */}
      <div className="flex items-center gap-2.5 mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#875B9A] bg-[#875B9A]/8 rounded-full px-3 py-1.5">
          Paso {step} de {TOTAL_STEPS}
        </span>
        <span className="text-xs text-gray-400 font-medium">{STEPS[step - 1]}</span>
      </div>

      {/* ── Step content ── */}
      <div className="pb-28">
        {step === 1 && (
          <StepCategory data={data} update={update} errors={errors} />
        )}
        {step === 2 && (
          <StepDetails data={data} update={update} errors={errors} />
        )}
        {step === 3 && (
          <StepPhotos
            data={data}
            fileInputRef={fileInputRef}
            clearPhoto={clearPhoto}
            errors={errors}
          />
        )}
        {step === 4 && (
          <StepLocation
            data={data}
            update={update}
            errors={errors}
            locating={locating}
            locationError={locationError}
            detectLocation={detectLocation}
          />
        )}
        {step === 5 && (
          <StepPrice
            data={data}
            update={update}
            errors={errors}
            serverError={serverError}
          />
        )}
      </div>

      {/* ── Fixed bottom navigation bar ── */}
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

          {/* Step dots */}
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
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#875B9A] hover:bg-[#6a437a] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Publicando...</>
              ) : (
                "Publicar equipo"
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

// ── Step 1: Category ──────────────────────────────────────────────────────────

function StepCategory({
  data, update, errors,
}: { data: WizardData; update: (p: Partial<WizardData>) => void; errors: StepErrors }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
        ¿Qué tipo de equipo vas a publicar?
      </h1>
      <p className="text-gray-500 mb-8 text-[15px]">
        Elige la categoría que mejor describe tu equipo.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map(({ value, label, Icon, desc }) => {
          const selected = data.category === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => update({ category: value })}
              className={`relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                selected
                  ? "border-[#875B9A] bg-[#875B9A]/5 shadow-sm"
                  : "border-gray-200 bg-white hover:border-[#875B9A]/40 hover:bg-gray-50"
              }`}
            >
              {selected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#875B9A] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
              <Icon
                className={`w-6 h-6 ${selected ? "text-[#875B9A]" : "text-gray-500"}`}
                strokeWidth={1.75}
              />
              <div>
                <p className={`text-sm font-semibold ${selected ? "text-[#875B9A]" : "text-gray-800"}`}>
                  {label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {errors.category && (
        <p className="mt-5 flex items-center gap-1.5 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errors.category}
        </p>
      )}
    </div>
  );
}

// ── Step 2: Details ───────────────────────────────────────────────────────────

function StepDetails({
  data, update, errors,
}: { data: WizardData; update: (p: Partial<WizardData>) => void; errors: StepErrors }) {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
          Cuéntanos sobre tu equipo
        </h1>
        <p className="text-gray-500 text-[15px]">
          Estos detalles ayudan a los clientes a encontrar exactamente lo que buscan.
        </p>
      </div>

      <Field label="Título" required error={errors.title}>
        <input
          type="text"
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          maxLength={100}
          placeholder="Ej: Parlante JBL EON615 — 1000W RMS"
          className={inputCx(!!errors.title)}
        />
        <div className="flex justify-between items-start">
          {errors.title ? <ErrorMsg>{errors.title}</ErrorMsg> : <span />}
          <span className="text-xs text-gray-400 shrink-0 ml-2">{data.title.length}/100</span>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Marca" required error={errors.brand}>
          <input
            type="text"
            value={data.brand}
            onChange={(e) => update({ brand: e.target.value })}
            maxLength={60}
            placeholder="Ej: JBL"
            className={inputCx(!!errors.brand)}
          />
          {errors.brand && <ErrorMsg>{errors.brand}</ErrorMsg>}
        </Field>

        <Field label="Modelo">
          <input
            type="text"
            value={data.model}
            onChange={(e) => update({ model: e.target.value })}
            maxLength={60}
            placeholder="Ej: EON615"
            className={inputCx(false)}
          />
        </Field>
      </div>

      <Field label="Descripción">
        <textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={4}
          maxLength={1000}
          placeholder="Describe el estado del equipo, qué incluye, condiciones especiales..."
          className={`${inputCx(false)} resize-none`}
        />
        <p className="text-xs text-gray-400 text-right">{data.description.length}/1000</p>
      </Field>
    </div>
  );
}

// ── Step 3: Photos ────────────────────────────────────────────────────────────

function StepPhotos({
  data, fileInputRef, clearPhoto, errors,
}: {
  data: WizardData;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  clearPhoto: () => void;
  errors: StepErrors;
}) {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
          Añade una foto de tu equipo
        </h1>
        <p className="text-gray-500 text-[15px]">
          Las buenas fotos generan más reservas. Usa luz natural y fondo limpio.
        </p>
      </div>

      {/* Dropzone — clicking here triggers the file input inside the hidden form */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full rounded-3xl border-2 border-dashed overflow-hidden cursor-pointer group transition-all duration-200 aspect-video ${
          data.previewUrl
            ? "border-[#875B9A]"
            : errors.imageFile
            ? "border-red-300 bg-red-50 flex items-center justify-center"
            : "border-gray-200 bg-gray-50 hover:border-[#875B9A]/60 hover:bg-[#875B9A]/3 flex items-center justify-center"
        }`}
      >
        {data.previewUrl ? (
          <>
            <Image src={data.previewUrl} alt="Vista previa" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <Camera className="w-7 h-7 text-white" />
              <span className="text-white text-sm font-semibold">Cambiar foto</span>
            </div>
          </>
        ) : (
          <div className={`flex flex-col items-center gap-3 p-8 text-center transition-colors ${
            errors.imageFile ? "text-red-400" : "text-gray-400 group-hover:text-[#875B9A]"
          }`}>
            <Camera className="w-10 h-10" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold">Haz clic para subir una foto</p>
              <p className="text-xs mt-1 text-gray-400">JPG, PNG, WebP — máximo 5 MB</p>
            </div>
          </div>
        )}
      </div>

      {errors.imageFile && (
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errors.imageFile}
        </p>
      )}

      {data.previewUrl && (
        <button
          type="button"
          onClick={clearPhoto}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
          Eliminar foto
        </button>
      )}
    </div>
  );
}

// ── Step 4: Location ──────────────────────────────────────────────────────────

function StepLocation({
  data, update, errors, locating, locationError, detectLocation,
}: {
  data: WizardData;
  update: (p: Partial<WizardData>) => void;
  errors: StepErrors;
  locating: boolean;
  locationError: string | null;
  detectLocation: () => void;
}) {
  const hasGps = data.latitude != null && data.longitude != null;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
          ¿Dónde está tu equipo?
        </h1>
        <p className="text-gray-500 text-[15px]">
          Los clientes ven la ciudad, nunca tu dirección exacta.
        </p>
      </div>

      <button
        type="button"
        onClick={detectLocation}
        disabled={locating}
        className={`w-full flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-200 disabled:opacity-60 ${
          hasGps
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-[#875B9A]/50 hover:text-[#875B9A] hover:bg-[#875B9A]/3"
        }`}
      >
        {locating ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Detectando ubicación...</>
        ) : hasGps ? (
          <><Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />Coordenadas detectadas ({data.latitude!.toFixed(4)}, {data.longitude!.toFixed(4)})</>
        ) : (
          <><LocateFixed className="w-4 h-4" />Usar mi ubicación actual <span className="text-gray-400 font-normal ml-1">(opcional)</span></>
        )}
      </button>

      {locationError && (
        <p className="text-xs text-red-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{locationError}
        </p>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400">o escribe tu ubicación</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Ciudad" required error={errors.city}>
          <input
            type="text"
            value={data.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="Ej: Quito"
            className={inputCx(!!errors.city)}
          />
          {errors.city && <ErrorMsg>{errors.city}</ErrorMsg>}
        </Field>

        <Field label="Provincia / Estado" required error={errors.state}>
          <input
            type="text"
            value={data.state}
            onChange={(e) => update({ state: e.target.value })}
            placeholder="Ej: Pichincha"
            className={inputCx(!!errors.state)}
          />
          {errors.state && <ErrorMsg>{errors.state}</ErrorMsg>}
        </Field>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 rounded-2xl p-4 border border-blue-100">
        <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          La ubicación es <strong>obligatoria</strong> para publicar tu equipo y aparece en el mapa del catálogo.
        </p>
      </div>
    </div>
  );
}

// ── Step 5: Price & Review ────────────────────────────────────────────────────

function StepPrice({
  data, update, errors, serverError,
}: {
  data: WizardData;
  update: (p: Partial<WizardData>) => void;
  errors: StepErrors;
  serverError?: string | null;
}) {
  const selectedCat = CATEGORIES.find((c) => c.value === data.category);

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
          Fija tu precio
        </h1>
        <p className="text-gray-500 text-[15px]">
          Define el precio de alquiler por día de tu equipo.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-gray-800">
          Precio por día (USD) <span className="text-red-500">*</span>
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-5 text-2xl font-semibold text-gray-300 select-none">$</span>
          <input
            type="number"
            value={data.dailyPrice}
            onChange={(e) => update({ dailyPrice: e.target.value })}
            min="1"
            step="0.01"
            placeholder="0.00"
            className={`block w-full rounded-2xl border pl-12 pr-24 py-5 text-2xl font-semibold text-gray-900 placeholder:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all ${
              errors.dailyPrice ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
            }`}
          />
          <span className="absolute right-5 text-sm text-gray-400 font-medium whitespace-nowrap">USD / día</span>
        </div>
        {errors.dailyPrice && <ErrorMsg>{errors.dailyPrice}</ErrorMsg>}
      </div>

      {/* Review card */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Resumen del equipo
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          <ReviewRow label="Categoría" value={selectedCat?.label ?? data.category} />
          <ReviewRow label="Título"    value={data.title} />
          <ReviewRow label="Marca"     value={data.brand} />
          {data.model && <ReviewRow label="Modelo" value={data.model} />}
          <ReviewRow
            label="Ubicación"
            value={[data.city, data.state].filter(Boolean).join(", ")}
          />
          <ReviewRow
            label="Foto"
            value={data.previewUrl ? "✓ Lista" : "—"}
            valueClass={data.previewUrl ? "text-green-600 font-semibold" : "text-gray-400"}
          />
        </div>
      </div>

      {/* Publish toggle */}
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
              ? "El equipo será visible en el catálogo público al instante."
              : "Solo tú podrás verlo. Puedes publicarlo cuando quieras."}
          </p>
        </div>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600 font-medium">{serverError}</p>
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  label, value, valueClass = "text-gray-800",
}: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium max-w-[55%] text-right truncate ${valueClass}`}>
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {children}
    </p>
  );
}

function inputCx(hasError: boolean) {
  return `block w-full rounded-2xl border px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all ${
    hasError
      ? "border-red-300 bg-red-50"
      : "border-gray-200 bg-gray-50 hover:border-gray-300"
  }`;
}
