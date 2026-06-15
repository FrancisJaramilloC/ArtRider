"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import LocationPickerWrapper from "@/components/location-picker/LocationPickerWrapper";
import type { LocationData } from "@/components/location-picker/LocationPicker";

// Definición de categorías
const CATEGORIES = [
  { value: "audio",       label: "Sonido"       },
  { value: "lighting",    label: "Iluminación"  },
  { value: "video",       label: "Video"        },
  { value: "effects",     label: "Efectos"      },
  { value: "advertising", label: "Publicidad"   },
  { value: "other",       label: "Otro"         },
];

// Interfaz de propiedades del componente
type Props = {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  defaultValues?: {
    title?: string;
    brand?: string;
    model?: string;
    category?: string;
    dailyPrice?: number; // in cents
    description?: string;
    cover_image_url?: string | null;
    is_published?: boolean;
    city?: string;
    state?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  submitLabel?: string;
};

// Renderizado del formulario de listado
export default function ListingForm({
  formAction,
  isPending,
  defaultValues = {},
  submitLabel = "Guardar equipo",
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    defaultValues.cover_image_url ?? null
  );
  const [publishNow, setPublishNow] = useState(defaultValues.is_published ?? false);
  const [imageError, setImageError] = useState(false);

  // Estado de la ubicación - manejada por el componente LocationPicker
  const [locationData, setLocationData] = useState({
    city: defaultValues.city ?? "",
    state: defaultValues.state ?? "",
    latitude: defaultValues.latitude ?? null as number | null,
    longitude: defaultValues.longitude ?? null as number | null,
  });

  // Función que maneja el cambio en la ubicación
  const handleLocationChange = (loc: LocationData) => {
    setLocationData({
      city: loc.city,
      state: loc.state,
      latitude: loc.lat,
      longitude: loc.lng,
    });
  };

  // Determina si el formulario está en modo edición
  const isEditing = !!defaultValues.cover_image_url;

  // Convierte cents a dollars para visualización
  const defaultPrice = defaultValues.dailyPrice
    ? (defaultValues.dailyPrice / 100).toFixed(2)
    : "";

  // Función que maneja el cambio en la imagen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validación del tamaño de la imagen
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5MB.");
      e.target.value = "";
      return;
    }
    // Creación de la URL de previsualización
    setPreviewUrl(URL.createObjectURL(file));
    setImageError(false);
  };

  // Renderizado del formulario
  return (
    <div className="space-y-6" onSubmit={(e) => {
      if (!isEditing && !previewUrl) {
        e.preventDefault();
        setImageError(true);
        return;
      }
      setImageError(false);
    }}>
      {/* Foto del equipo */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Foto del equipo <span className="text-red-500">*</span></label>
        <div
          className="relative w-full h-52 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer group hover:border-[#875B9A] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Renderizado de la imagen */}
          {previewUrl ? (
            <Image src={previewUrl} alt="Preview" fill className="object-cover rounded-2xl" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#875B9A] transition-colors">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-sm font-medium">Haz clic para subir una foto</span>
              <span className="text-xs">JPG, PNG — máximo 5MB</span>
            </div>
          )}
          {/* Renderizado del boton de cambiar foto */}
          {previewUrl && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
              <span className="text-white text-sm font-semibold">Cambiar foto</span>
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
        {imageError && (
          <p className="text-sm text-red-500 font-medium">Debes subir una foto del equipo.</p>
        )}
      </div>

      {/* Título */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Título del equipo <span className="text-red-500">*</span>
        </label>
        <input
          id="title" name="title" type="text" required
          defaultValue={defaultValues.title ?? ""}
          maxLength={100} minLength={3}
          placeholder="Ej: Parlante JBL EON615 — 1000W RMS"
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
        />
      </div>

      {/* Marca + Modelo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Marca <span className="text-red-500">*</span></label>
          <input
            id="brand" name="brand" type="text" required
            defaultValue={defaultValues.brand ?? ""}
            maxLength={60} placeholder="Ej: JBL"
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="model" className="block text-sm font-medium text-gray-700">Modelo</label>
          <input
            id="model" name="model" type="text"
            defaultValue={defaultValues.model ?? ""}
            maxLength={60} placeholder="Ej: EON615"
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Categoría <span className="text-red-500">*</span>
        </label>
        <select
          id="category" name="category" required
          defaultValue={defaultValues.category ?? ""}
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
        >
          <option value="" disabled>Selecciona una categoría</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Precio por día */}
      <div className="space-y-1.5">
        <label htmlFor="dailyPrice" className="block text-sm font-medium text-gray-700">
          Precio por día (USD) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 text-sm font-medium">$</span>
          <input
            id="dailyPrice" name="dailyPrice" type="number"
            defaultValue={defaultPrice}
            min="1" step="0.01"
            placeholder="0.00"
            required
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          id="description" name="description" rows={4}
          defaultValue={defaultValues.description ?? ""}
          maxLength={1000}
          placeholder="Describe el estado del equipo, qué incluye, condiciones especiales de alquiler..."
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all resize-none"
        />
        <p className="text-xs text-gray-400">Máximo 1000 caracteres.</p>
      </div>

      {/* Ubicación - mismo picker interactivo que el asistente de creación */}
      <div className="space-y-3">
        <LocationPickerWrapper
          onChange={handleLocationChange}
          initialLocation={
            defaultValues.latitude != null && defaultValues.longitude != null
              ? {
                  lat: defaultValues.latitude,
                  lng: defaultValues.longitude,
                  city: defaultValues.city,
                  state: defaultValues.state,
                }
              : undefined
          }
        />

        {/* Campos ocultos leídos por la server action */}
        <input type="hidden" name="city"      value={locationData.city} />
        <input type="hidden" name="state"     value={locationData.state} />
        <input type="hidden" name="latitude"  value={locationData.latitude  ?? ""} />
        <input type="hidden" name="longitude" value={locationData.longitude ?? ""} />
      </div>

      {/* Publicar toggle */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <button
          type="button"
          role="switch"
          aria-checked={publishNow}
          onClick={() => setPublishNow(!publishNow)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${publishNow ? "bg-[#875B9A]" : "bg-gray-200"}`}
        >
          {/* Switch de publicar */}
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${publishNow ? "translate-x-5" : "translate-x-0"}`} />
        </button>
        <input type="hidden" name="publishNow" value={String(publishNow)} />
        {/* Descripcion del switch */}
        <div>
          <p className="text-sm font-medium text-gray-800">
            {publishNow ? "Publicar inmediatamente" : "Guardar como borrador"}
          </p>
          <p className="text-xs text-gray-400">
            {publishNow
              ? "El equipo será visible en el catálogo público."
              : "Solo tú podrás ver este equipo. Puedes publicarlo más tarde."}
          </p>
        </div>
      </div>

      {/* Boton de enviar */}
      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#875B9A] hover:bg-[#6a437a] text-white py-3 text-sm font-semibold transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : submitLabel}
      </button>
    </div>
  );
}
