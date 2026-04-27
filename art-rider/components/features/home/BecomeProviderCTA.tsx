"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function BecomeProviderCTA() {
  return (
    <section className="bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Bento Card — elegant, contained */}
        <div className="bg-[#1C1C1E] rounded-3xl px-8 py-10 md:px-12 md:py-12 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          
          {/* Subtle Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(135,91,154,0.10)_0%,transparent_70%)] pointer-events-none" />

          {/* Left: Text */}
          <div className="relative z-10 md:max-w-md">
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-1.5">
              Monetiza tus equipos.
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Publica tu equipo y genera ingresos pasivos con cada reserva.
            </p>
          </div>

          {/* Right: CTA */}
          <Link
            href="/become-a-provider"
            className="relative z-10 inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Ser proveedor
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

        </div>
      </div>
    </section>
  );
}
