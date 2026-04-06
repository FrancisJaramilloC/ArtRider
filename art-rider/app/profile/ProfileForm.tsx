"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { updateProfile } from "@/services/profileService";

interface ProfileFormProps {
  initialData: {
    fullName: string;
    email: string;
    phone: string;
    birthDate: string;
    avatarUrl: string | null;
    hasBirthDate: boolean;
    avatarUpdatedAt: string | null;
  };
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData.avatarUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  useEffect(() => {
    // Cleanup generated object URLs to prevent memory leaks mapping isolated references
    return () => {
      if (previewUrl && previewUrl !== initialData.avatarUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  }, [previewUrl, initialData.avatarUrl]);

  return (
    <form action={formAction} className="space-y-6">
      {/* ── Avatar Section ── */}
      <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#875B9A] to-[#6a437a] flex items-center justify-center shadow-md shrink-0 overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-white tracking-widest">
              {initialData.fullName.substring(0, 2).toUpperCase() || "US"}
            </span>
          )}
        </div>
        <div>
          <input
            type="file"
            name="avatarFile"
            id="avatarFile"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[0.95rem] font-semibold text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full transition-colors shadow-sm"
          >
            Cambiar foto
          </button>
          <p className="text-sm text-gray-400 mt-2">JPG, PNG, JFIF, JPEG. Máximo 2MB.</p>
          {initialData.avatarUpdatedAt && (
            <p className="text-[0.75rem] text-amber-600 font-medium mt-1">
              Última actualización: {new Date(initialData.avatarUpdatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* ── Form Card: Datos Básicos ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">Datos Básicos</h3>
          <p className="text-sm text-gray-500 mt-0.5">La información principal asociada a tu cuenta.</p>
        </div>

        {/* State Banners */}
        {state?.error && (
          <div className="mx-6 mt-6 rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-600 font-medium">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="mx-6 mt-6 rounded-md bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-700 font-medium tracking-wide">
            {state.success}
          </div>
        )}

        <div className="p-6 space-y-5">
          <div className="grid gap-2">
            <label htmlFor="fullName" className="text-sm font-medium text-gray-700">Nombre Completo</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              defaultValue={initialData.fullName}
              required
              className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">Número de Teléfono</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                defaultValue={initialData.phone}
                pattern="^\+?[0-9\s\-()]{10,15}$"
                title="Por favor ingresa un formato válido de teléfono."
                required
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="birthDate" className="text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                defaultValue={initialData.birthDate}
                required
                disabled={initialData.hasBirthDate}
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
              {initialData.hasBirthDate && (
                 <p className="text-[0.8rem] text-gray-500">La fecha de nacimiento no puede ser modificada.</p>
              )}
            </div>
          </div>

          <div className="grid gap-2 pt-2 border-t border-gray-100">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              defaultValue={initialData.email}
              className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-500"
              disabled
            />
            <p className="text-[0.8rem] text-gray-500">Para cambiar tu correo electrónico, comunícate con soporte.</p>
          </div>
        </div>

        <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="bg-[#875B9A] hover:bg-[#6a437a] text-white px-6 py-2.5 rounded-full text-[0.95rem] font-semibold transition-colors shadow-sm disabled:bg-gray-400"
          >
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  );
}
