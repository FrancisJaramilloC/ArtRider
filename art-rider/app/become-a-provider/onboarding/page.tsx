"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { becomeProvider } from "@/services/providerService";
import Link from "next/link";

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(becomeProvider, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Back */}
        <Link href="/become-a-provider" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Volver
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#875B9A] uppercase tracking-widest mb-2">Paso 1 de 1</p>
          <h1 className="text-3xl font-bold text-gray-900">Configura tu perfil de proveedor</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Una vez enviado, nuestro equipo revisará tu solicitud junto a la verificación de identidad (KYC). Te notificaremos cuando tu cuenta esté activa.
          </p>
        </div>

        {/* Status Banner */}
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-amber-800">
            La aprobación puede tomar <strong>1-3 días hábiles</strong>. Mientras tanto, puedes preparar tus listings en borrador.
          </p>
        </div>

        {/* Error */}
        {state?.error && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600 font-medium">{state.error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form action={formAction} className="space-y-5">
            {/* Brand name */}
            <div className="space-y-1.5">
              <label htmlFor="brandName" className="block text-sm font-medium text-gray-700">
                Nombre de tu negocio / marca <span className="text-red-500">*</span>
              </label>
              <input
                id="brandName"
                name="brandName"
                type="text"
                required
                maxLength={80}
                placeholder="Ej: AudioPro Ecuador"
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-400">Este nombre será visible públicamente en tus listings.</p>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                Descripción breve <span className="text-gray-400">(opcional)</span>
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={500}
                placeholder="Cuéntanos sobre tu negocio, experiencia o especialidad..."
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all resize-none"
              />
              <p className="text-xs text-gray-400">Máximo 500 caracteres.</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#875B9A] hover:bg-[#6a437a] text-white py-3 text-sm font-semibold transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isPending ? "Enviando solicitud..." : "Enviar solicitud →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
