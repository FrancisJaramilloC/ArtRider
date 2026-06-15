"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// componente que muestra un boton CTA para convertirse en proveedor
function ProviderCTAButton({ className }: { className?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // useEffect para obtener el usuario
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    // useEffect para manejar el cambio de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase]);

  // si el usuario no está autenticado, mostrar boton de inicio de sesión
  if (loading) {
    return (
      <span className={className ?? ""}>
        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        Cargando...
      </span>
    );
  }

  // si el usuario está autenticado, redirigirlo a su panel
  if (user) {
    return (
      <Link href="/become-a-provider/onboarding" className={className ?? ""}>
        Comenzar mi solicitud
        <ArrowRight className="w-4 h-4" />
      </Link>
    );
  }

  // si el usuario no está autenticado, mostrar boton de inicio de sesión
  return (
    <Link
      href="/login?redirect=/become-a-provider"
      className={className ?? ""}
    >
      Iniciar sesión para aplicar
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

// componente principal de la pagina de registro
export default function BecomeProviderLanding() {
  return (
    <div className="flex flex-col bg-white">
      
      {/* ── Section 1: Hero ── */}
      <section className="w-full flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-20 relative overflow-hidden bg-white">
        {/* Subtle Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(135,91,154,0.06)_0%,transparent_70%)] pointer-events-none" />

        <h1 className="relative z-10 text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 leading-tight mb-4 max-w-3xl">
          El negocio de{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#875B9A] to-[#6a437a]">la creatividad.</span>
        </h1>
        <p className="relative z-10 text-sm md:text-base text-gray-500 max-w-xl font-normal leading-relaxed mb-10">
          Convierte tus equipos de cámara, iluminación y sonido en un activo rentable. Únete a la plataforma líder de renta audiovisual.
        </p>

        {/* boton dinamico */}
        <ProviderCTAButton className="relative z-10 inline-flex items-center gap-2.5 bg-[#1C1C1E] hover:bg-black text-white px-8 py-3.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg" />
      </section>

      {/* seccion 2: 0% de comision */}
      <section className="w-full bg-[#FAFAFA] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
          
          {/* seccion 2 izquierda: texto */}
          <div className="flex-1 flex flex-col justify-center">
            <span className="text-[#875B9A] font-semibold text-xs tracking-widest uppercase mb-4">Modelo de negocio</span>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug text-gray-900 mb-4">
              Gana más. Sin letra chica.
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-8">
              Mantén el 100% de tus ingresos iniciales. No cobramos comisiones por subir tus equipos ni cuotas de mantenimiento mensual.
            </p>
            <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ingreso estimado</p>
              <div className="text-4xl font-bold text-gray-900 tracking-tight mb-1">$450<span className="text-xl text-gray-400 font-medium">/mes</span></div>
              <p className="text-xs text-gray-500">Basado en el alquiler promedio de 2 equipos profesionales a la semana.</p>
            </div>
          </div>
          
          {/* seccion 2 derecha: visualizacion de la app */}
          <div className="flex-1 w-full">
            <div className="w-full aspect-[4/3] rounded-2xl bg-gray-100 border border-gray-200 flex flex-col items-center justify-center overflow-hidden relative">
               <div className="w-16 h-16 bg-white/60 rounded-full flex items-center justify-center mb-3 shadow-sm backdrop-blur-md">
                 <span className="text-2xl">📸</span>
               </div>
               <span className="text-gray-400 font-semibold tracking-wider uppercase text-xs">Dashboard Preview</span>
            </div>
          </div>

        </div>
      </section>

      {/* seccion 3: seguridad */}
      <section className="w-full bg-[#1C1C1E] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug mb-3">
              Tranquilidad absoluta.
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Hemos construido ArtRider Cover para proteger tu inversión. Cada renta está asegurada y cada usuario estrictamente verificado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
            {/* Card 1 */}
            <div className="flex flex-col p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
              <span className="text-[#D4A5E8] font-semibold text-xs tracking-widest uppercase mb-4">ArtRider Cover</span>
              <h3 className="text-lg font-semibold mb-2 tracking-tight">Protección de $5,000.</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                En el raro caso de daño accidental, nuestra póliza cubre reparaciones y reemplazos sin fricciones. Tu equipo siempre está a salvo.
              </p>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
              <span className="text-[#D4A5E8] font-semibold text-xs tracking-widest uppercase mb-4">Verificación KYC</span>
              <h3 className="text-lg font-semibold mb-2 tracking-tight">Identidad validada.</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                No cualquiera puede alquilar. Requerimos identificación oficial, verificación biométrica facial y validación de tarjeta de crédito.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* seccion 4: CTA final */}
      <section className="py-16 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 bg-white">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 leading-snug mb-6">
          ¿Listo para monetizar?
        </h2>

        {/* Dynamic CTA — bottom */}
        <ProviderCTAButton className="inline-flex items-center gap-2.5 bg-[#875B9A] hover:bg-[#6B427E] text-white px-8 py-3.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-900/10" />
      </section>

    </div>
  );
}
