"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Componente de llamado a la accion para ser proveedor
export function BecomeProviderCTA() {
  return (
    <section className="bg-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        <div className="relative overflow-hidden bg-gray-900 rounded-2xl shadow-md border border-white/5 p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

          {/* Borde superior sutil */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#875B9A]/70 to-transparent" />

          {/* Brillo radial sutil */}
          <div
            aria-hidden="true"
            className="absolute -left-16 top-1/2 -translate-y-1/2 w-[380px] h-[280px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(135,91,154,0.10) 0%, transparent 70%)",
            }}
          />

          {/* Bloque de texto */}
          <div className="relative z-10 max-w-md">
            <p className="text-[0.7rem] font-semibold tracking-widest uppercase text-[#a97dc4] mb-2">
              Para proveedores
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mb-2">
              Monetiza tus equipos.
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Publica tu equipo y genera ingresos pasivos con cada reserva verificada.
            </p>
          </div>

          {/* Boton de llamado a la accion */}
          <Link
            href="/become-a-provider"
            className="relative z-10 inline-flex items-center gap-2 bg-white hover:bg-gray-50 active:scale-95 text-gray-900 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 shadow-sm"
          >
            Ser proveedor
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

        </div>
      </div>
    </section>
  );
}
