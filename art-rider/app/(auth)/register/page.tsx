"use client";

import { useActionState, useRef } from "react";
import { signUp } from "@/services/authService";
import Link from "next/link";

// ── ArtRider Logo Component ────────────────────────────────────────────────────
function ArtRiderLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full border-2 border-gray-900 flex items-center justify-center">
        <svg viewBox="0 0 427 448" fill="currentColor" className="w-9 h-9 text-gray-900">
          <path d="M13.5 148C6.044 148 0 154.044 0 161.5v125c0 7.456 6.044 13.5 13.5 13.5S27 293.456 27 286.5v-125C27 154.044 20.956 148 13.5 148z"/>
          <path d="M74.5 101C67.044 101 61 107.044 61 114.5v219c0 7.456 6.044 13.5 13.5 13.5S88 340.456 88 333.5v-219C88 107.044 81.956 101 74.5 101z"/>
          <path d="M135.5 54C128.044 54 122 60.044 122 67.5v313c0 7.456 6.044 13.5 13.5 13.5S149 387.456 149 380.5V67.5C149 60.044 142.956 54 135.5 54z"/>
          <path d="M196.5 0C189.044 0 183 6.044 183 13.5v421c0 7.456 6.044 13.5 13.5 13.5S210 441.956 210 434.5V13.5C210 6.044 203.956 0 196.5 0z"/>
          <path d="M257.5 54C250.044 54 244 60.044 244 67.5v313c0 7.456 6.044 13.5 13.5 13.5S271 387.456 271 380.5V67.5C271 60.044 264.956 54 257.5 54z"/>
          <path d="M318.5 101C311.044 101 305 107.044 305 114.5v219c0 7.456 6.044 13.5 13.5 13.5S332 340.456 332 333.5v-219C332 107.044 325.956 101 318.5 101z"/>
          <path d="M379.5 148C372.044 148 366 154.044 366 161.5v125c0 7.456 6.044 13.5 13.5 13.5S393 293.456 393 286.5v-125C393 154.044 386.956 148 379.5 148z"/>
        </svg>
      </div>
      <span className="font-extrabold text-xl text-gray-900 tracking-tight">ArtRider</span>
    </div>
  );
}

// ── Shared Input with Icon ────────────────────────────────────────────────────
function InputField({
  id, name, type = "text", label, placeholder, icon, required = false,
  maxLength, minLength, pattern, title,
}: {
  id: string; name: string; type?: string; label: string; placeholder?: string;
  icon: React.ReactNode; required?: boolean; maxLength?: number; minLength?: number;
  pattern?: string; title?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>
        <input
          id={id} name={name} type={type} required={required}
          maxLength={maxLength} minLength={minLength} pattern={pattern} title={title}
          placeholder={placeholder}
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
        />
      </div>
    </div>
  );
}

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconEmail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.9 17.5z"/>
  </svg>
);
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleConfirmChange = () => {
    if (confirmRef.current && passwordRef.current) {
      if (confirmRef.current.value !== passwordRef.current.value) {
        confirmRef.current.setCustomValidity('Las contraseñas no coinciden.');
      } else {
        confirmRef.current.setCustomValidity('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-4 py-8">
      {/* Back link — absolute top-left */}
      <Link
        href="/"
        className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors z-10"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver al inicio
      </Link>

      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <ArtRiderLogo />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Crear cuenta</h1>
            <p className="text-sm text-gray-500 mt-1">Únete a la comunidad de ArtRider</p>
          </div>

          {/* Error banner */}
          {state?.error && (
            <div className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200">
              <p className="text-sm text-red-600 font-medium">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <InputField id="firstName" name="firstName" label="Nombre" placeholder="Tu nombre"
                icon={<IconUser />} required maxLength={50} />
              <InputField id="lastName" name="lastName" label="Apellido" placeholder="Tu apellido"
                icon={<IconUser />} required maxLength={50} />
            </div>

            {/* Email */}
            <InputField id="email" name="email" type="email" label="Correo electrónico"
              placeholder="tu@email.com" icon={<IconEmail />} required maxLength={254} />

            {/* Phone */}
            <InputField
              id="phone" name="phone" type="tel" label="Teléfono de contacto *"
              placeholder="+1 234 567 8900" icon={<IconPhone />} required
              maxLength={15} pattern="^\+?[0-9\s\-()]{10,15}$"
              title="Ingresa un número de teléfono válido (10-15 dígitos)."
            />

            {/* Birth date */}
            <div className="space-y-1.5">
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                Fecha de nacimiento
              </label>
              <input
                id="birthDate" name="birthDate" type="date" required
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <IconLock />
                </div>
                <input
                  id="password" name="password" type="password" required
                  ref={passwordRef}
                  onChange={handleConfirmChange}
                  placeholder="••••••••"
                  minLength={8} maxLength={72}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <IconLock />
                </div>
                <input
                  id="confirmPassword" name="confirmPassword" type="password" required
                  ref={confirmRef}
                  onChange={handleConfirmChange}
                  placeholder="••••••••"
                  minLength={8} maxLength={72}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#875B9A] hover:bg-[#6a437a] text-white py-3 text-sm font-semibold transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed mt-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              {isPending ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="font-semibold text-[#875B9A] hover:text-[#6a437a] transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
