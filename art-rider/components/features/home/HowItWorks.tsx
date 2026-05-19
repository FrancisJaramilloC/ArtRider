"use client";

import { Fragment } from "react";

//  Paso de como funciona
const STEPS = [
  {
    n: 1,
    title: "Explora equipos",
    desc: "Encuentra sonido e iluminación verificados.",
  },
  {
    n: 2,
    title: "Reserva al instante",
    desc: "Fechas, disponibilidad y pago seguro.",
  },
  {
    n: 3,
    title: "Crea tu evento",
    desc: "Recibe e instala en tu ubicación.",
  },
];

//  Componente de como funciona
export function HowItWorks() {
  return (
    <section className="bg-white py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight mb-6 sm:mb-10">
          Cómo funciona
        </h2>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0">
          {STEPS.map((step, idx) => (
            <Fragment key={step.n}>
              {/* Step */}
              <div className="flex items-start gap-3 flex-1">
                <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {step.n}
                </span>
                <div>
                  <p className="text-[0.95rem] font-medium text-gray-900 leading-snug">
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* Flecha — solo entre pasos, oculta en móvil */}
              {idx < STEPS.length - 1 && (
                <svg
                  className="hidden md:block w-6 h-6 text-gray-300 shrink-0 mx-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </Fragment>
          ))}
        </div>

      </div>
    </section>
  );
}
