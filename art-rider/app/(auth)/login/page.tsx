"use client";

import { useActionState, Suspense } from "react";
import { signIn } from "@/services/authService";
import Link from "next/link";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [state, formAction, isPending] = useActionState(signIn, null);
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
      {/* ── Left Panel (Brand) ── */}
      <div className="hidden md:flex flex-col md:w-5/12 lg:w-1/2 bg-gradient-to-br from-[#875B9A] via-[#6B427E] to-[#3A2246] text-white p-12 justify-between relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] bg-white/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[20rem] h-[20rem] bg-[#D4A5E8]/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-12">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors w-max group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span className="font-medium text-sm">Volver al inicio</span>
          </Link>
          
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-16 h-16 rounded-full border-2 border-white/90 flex items-center justify-center shadow-lg bg-white/10 backdrop-blur-sm">
                <svg viewBox="0 0 427 448" fill="currentColor" className="w-8 h-8 text-white">
                  <path d="M13.5 148C6.044 148 0 154.044 0 161.5v125c0 7.456 6.044 13.5 13.5 13.5S27 293.456 27 286.5v-125C27 154.044 20.956 148 13.5 148z"/>
                  <path d="M74.5 101C67.044 101 61 107.044 61 114.5v219c0 7.456 6.044 13.5 13.5 13.5S88 340.456 88 333.5v-219C88 107.044 81.956 101 74.5 101z"/>
                  <path d="M135.5 54C128.044 54 122 60.044 122 67.5v313c0 7.456 6.044 13.5 13.5 13.5S149 387.456 149 380.5V67.5C149 60.044 142.956 54 135.5 54z"/>
                  <path d="M196.5 0C189.044 0 183 6.044 183 13.5v421c0 7.456 6.044 13.5 13.5 13.5S210 441.956 210 434.5V13.5C210 6.044 203.956 0 196.5 0z"/>
                  <path d="M257.5 54C250.044 54 244 60.044 244 67.5v313c0 7.456 6.044 13.5 13.5 13.5S271 387.456 271 380.5V67.5C271 60.044 264.956 54 257.5 54z"/>
                  <path d="M318.5 101C311.044 101 305 107.044 305 114.5v219c0 7.456 6.044 13.5 13.5 13.5S332 340.456 332 333.5v-219C332 107.044 325.956 101 318.5 101z"/>
                  <path d="M379.5 148C372.044 148 366 154.044 366 161.5v125c0 7.456 6.044 13.5 13.5 13.5S393 293.456 393 286.5v-125C393 154.044 386.956 148 379.5 148z"/>
                </svg>
              </div>
              <span className="font-extrabold text-3xl tracking-tight drop-shadow-sm">ArtRider</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-5 drop-shadow-sm">
              Donde las ideas<br/>toman vida.
            </h2>
            <p className="text-lg text-white/80 max-w-md font-light leading-relaxed">
              Únete a la plataforma líder para creadores audiovisuales. Alquila, comparte y descubre el mejor equipamiento para tu próxima producción.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-white/50 font-medium">
          © {new Date().getFullYear()} ArtRider. Todos los derechos reservados.
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 bg-gray-50 md:bg-white relative">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex items-center justify-between mb-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Volver
          </Link>
          <ArtRiderLogo />
        </div>

        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-[2rem] font-extrabold text-gray-900 tracking-tight mb-2">Iniciar sesión</h1>
            <p className="text-[1rem] text-gray-500 font-medium">Bienvenido de vuelta a tu espacio creativo.</p>
          </div>

          {/* Error Banner */}
          {state?.error && (
            <div className="mb-6 rounded-2xl bg-red-50/80 backdrop-blur-sm p-4 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <input type="hidden" name="redirectUrl" value={redirectUrl} />
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Correo electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#875B9A] transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  placeholder="tu@email.com"
                  className="block w-full rounded-2xl border-0 bg-gray-100/80 pl-12 pr-4 py-3.5 text-[0.95rem] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#875B9A]/20 focus:outline-none shadow-sm shadow-gray-200/50 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-[#875B9A] hover:text-[#6a437a] transition-colors">
                  ¿La olvidaste?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#875B9A] transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  placeholder="••••••••"
                  className="block w-full rounded-2xl border-0 bg-gray-100/80 pl-12 pr-4 py-3.5 text-[0.95rem] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#875B9A]/20 focus:outline-none shadow-sm shadow-gray-200/50 transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="relative w-full overflow-hidden rounded-2xl bg-[#875B9A] hover:bg-[#724a83] text-white py-3.5 text-[1rem] font-bold shadow-md shadow-[#875B9A]/30 transition-all active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed group"
            >
              <div className="flex items-center justify-center gap-2">
                {isPending ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                )}
                {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
              </div>
            </button>
          </form>

          {/* Footer Text */}
          <div className="mt-8 text-center">
            <p className="text-[0.95rem] text-gray-500 font-medium">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-bold text-[#875B9A] hover:text-[#6a437a] transition-colors underline-offset-4 hover:underline">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="inline-block w-8 h-8 border-4 border-[#875B9A]/30 border-t-[#875B9A] rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
