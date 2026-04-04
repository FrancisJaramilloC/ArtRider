"use client";

import Link from "next/link";
import { BadgePercent, Headset, Lock } from "lucide-react";

export function BecomeProviderCTA() {
  return (
    <section className="bg-gray-50 py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col md:flex-row relative">
          
          {/* Subtle Accent Line Top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#875B9A]/60 via-[#875B9A] to-[#875B9A]/60" />

          {/* Left: CTA Text & Action */}
          <div className="flex-1 p-10 md:p-14 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f9f7fb] border border-[#ede9f2] text-[#875B9A] text-sm font-semibold tracking-wide w-fit mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#875B9A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#875B9A]"></span>
              </span>
              Nuevos Proveedores
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
              Usa el equipo que no usas para financiar el que sí usarás
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md">
              Únete a la red de creadores que monetizan su equipo audiovisual de forma segura y sencilla con ArtRider.
            </p>
            <div>
              <Link
                href="/register"
                className="inline-flex items-center justify-center bg-[#875B9A] hover:bg-[#6a437a] text-white px-8 py-3.5 rounded-full font-semibold transition-colors shadow-sm"
              >
                Conviértete en Proveedor
              </Link>
            </div>
          </div>

          {/* Right: Value Props Grid */}
          <div className="flex-1 bg-[#fcfbfc] p-10 md:p-14 border-t md:border-t-0 md:border-l border-gray-100 flex items-center">
            <div className="grid gap-8 w-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                  <BadgePercent className="w-6 h-6 text-[#875B9A]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">0% de comisión inicial</h3>
                  <p className="text-gray-600 mt-1">Sin cobros ocultos por registrarte o subir tus primeros equipos a la plataforma.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-[#875B9A]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Pagos 100% seguros</h3>
                  <p className="text-gray-600 mt-1">Verificamos la identidad de todos los usuarios y procesamos los pagos de forma segura.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                  <Headset className="w-6 h-6 text-[#875B9A]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Soporte 24/7</h3>
                  <p className="text-gray-600 mt-1">Nuestro equipo de soporte está siempre disponible para ayudarte en cualquier etapa de la renta.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
