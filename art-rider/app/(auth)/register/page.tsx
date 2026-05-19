"use client";

import { useActionState, useRef } from "react";
import { signUp } from "@/services/authService";
import Link from "next/link";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";

// componente para campos de formulario con icono
function InputField({
  id, name, type = "text", label, placeholder, icon, required = false,
  maxLength, minLength, pattern, title, onChange, inputRef
}: {
  id: string; name: string; type?: string; label: string; placeholder?: string;
  icon: React.ReactNode; required?: boolean; maxLength?: number; minLength?: number;
  pattern?: string; title?: string; onChange?: () => void; inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[0.85rem] font-semibold text-gray-700">{label}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#875B9A] transition-colors">
          {icon}
        </div>
        <input
          id={id} name={name} type={type} required={required}
          maxLength={maxLength} minLength={minLength} pattern={pattern} title={title}
          placeholder={placeholder}
          ref={inputRef as React.RefObject<HTMLInputElement>}
          onChange={onChange}
          className="block w-full rounded-2xl border-0 bg-gray-100/80 pl-11 pr-4 py-3 text-[0.9rem] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#875B9A]/20 focus:outline-none shadow-sm shadow-gray-200/50 transition-all duration-200"
        />
      </div>
    </div>
  );
}

// iconos para el formulario de registro
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconEmail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.9 17.5z"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// componente principal de la pagina de registro
export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // funcion para validar que las contraseñas coincidan
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
    <div className="min-h-screen flex flex-col md:flex-row-reverse bg-white font-sans">
      {/* panel izquierdo con el logo y la marca */}
      <div className="hidden md:flex flex-col md:w-5/12 lg:w-1/2 bg-gradient-to-bl from-[#875B9A] via-[#6B427E] to-[#3A2246] text-white p-12 justify-between relative overflow-hidden">
        {/* elementos decorativos del panel izquierdo */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />
        <div className="absolute top-32 -right-32 w-[30rem] h-[30rem] bg-[#C29ACF]/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-12 -left-12 w-[25rem] h-[25rem] bg-white/10 rounded-full blur-[90px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-12 items-end text-right">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors w-max group">
            <span className="font-medium text-sm">Volver al inicio</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
          {/* div con el contenido del panel izquierdo */}
          <div className="mt-8 flex flex-col items-end">
            <div className="flex items-center gap-3 mb-8 flex-row-reverse">
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
              Empieza tu viaje<br/>creativo.
            </h2>
            <p className="text-lg text-white/80 max-w-md font-light leading-relaxed">
              Crea tu cuenta gratis hoy y accede al mayor inventario de equipamiento profesional. Todo lo que necesitas para tu próximo rodaje, a un clic de distancia.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-white/50 font-medium text-right">
          © {new Date().getFullYear()} ArtRider. Todos los derechos reservados.
        </div>
      </div>

      {/* panel derecho con el formulario de registro */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20 bg-gray-50 md:bg-white relative">
        {/* header del panel derecho */}
        <div className="md:hidden flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Volver
          </Link>
          <ArtRiderLogo />
        </div>

        {/* div con el formulario de registro */}
        <div className="w-full max-w-md mx-auto">
          {/* header del formulario */}
          <div className="mb-8">
            <h1 className="text-[2rem] font-extrabold text-gray-900 tracking-tight mb-2">Crear cuenta</h1>
            <p className="text-[1rem] text-gray-500 font-medium">Únete a la comunidad de ArtRider hoy.</p>
          </div>

          {/* banner de error */}
          {state?.error && (
            <div className="mb-6 rounded-2xl bg-red-50/80 backdrop-blur-sm p-4 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{state.error}</p>
            </div>
          )}

          {/* formulario */}
          <form action={formAction} className="space-y-4">
            {/* campos de nombre y apellido */}
            <div className="grid grid-cols-2 gap-4">
              <InputField id="firstName" name="firstName" label="Nombre" placeholder="Tu nombre" icon={<IconUser />} required maxLength={50} />
              <InputField id="lastName" name="lastName" label="Apellido" placeholder="Tu apellido" icon={<IconUser />} required maxLength={50} />
            </div>

            <InputField id="email" name="email" type="email" label="Correo electrónico" placeholder="tu@email.com" icon={<IconEmail />} required maxLength={254} />

            <InputField id="phone" name="phone" type="tel" label="Teléfono de contacto" placeholder="+1 234 567 8900" icon={<IconPhone />} required maxLength={15} pattern="^\+?[0-9\s\-()]{10,15}$" title="Ingresa un número de teléfono válido (10-15 dígitos)." />

            <InputField id="birthDate" name="birthDate" type="date" label="Fecha de nacimiento" icon={<IconCalendar />} required />

            <InputField id="password" name="password" type="password" label="Contraseña" placeholder="••••••••" icon={<IconLock />} required minLength={8} maxLength={72} inputRef={passwordRef} onChange={handleConfirmChange} />

            <InputField id="confirmPassword" name="confirmPassword" type="password" label="Confirmar contraseña" placeholder="••••••••" icon={<IconLock />} required minLength={8} maxLength={72} inputRef={confirmRef} onChange={handleConfirmChange} />

            {/* boton de envio */}
            <button
              type="submit"
              disabled={isPending}
              className="relative w-full overflow-hidden rounded-2xl bg-[#875B9A] hover:bg-[#724a83] text-white py-3.5 text-[1rem] font-bold shadow-md shadow-[#875B9A]/30 transition-all active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed group mt-6"
            >
              <div className="flex items-center justify-center gap-2">
                {isPending ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                )}
                {isPending ? "Creando cuenta..." : "Crear cuenta"}
              </div>
            </button>
          </form>

          {/* Footer Text */}
          <div className="mt-8 text-center">
            <p className="text-[0.95rem] text-gray-500 font-medium">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="font-bold text-[#875B9A] hover:text-[#6a437a] transition-colors underline-offset-4 hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
