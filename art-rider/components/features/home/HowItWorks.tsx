"use client";

import { Search, CalendarCheck, ShieldCheck, Smile } from "lucide-react";

const steps = [
  {
    icon: <Search className="w-6 h-6 text-[#875B9A]" />,
    title: "Explora",
    description: "Encuentra el equipo audiovisual perfecto para tu proyecto.",
  },
  {
    icon: <CalendarCheck className="w-6 h-6 text-[#875B9A]" />,
    title: "Reserva",
    description: "Selecciona las fechas y solicita la reserva al propietario.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-[#875B9A]" />,
    title: "Pago Seguro",
    description: "Realiza el pago con total tranquilidad a través de nuestra plataforma segura.",
  },
  {
    icon: <Smile className="w-6 h-6 text-[#875B9A]" />,
    title: "Disfruta",
    description: "Recoge el equipo, realiza tu proyecto y devuélvelo al finalizar.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            ¿Cómo funciona ArtRider?
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Alquilar el equipo que necesitas nunca ha sido tan fácil. Sigue estos 4 sencillos pasos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative">
          {/* Optional connecting line for larger screens */}
          <div className="hidden lg:block absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-gray-100 -z-10" />

          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center relative z-10">
              <div className="w-14 h-14 bg-[#f9f7fb] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[#ede9f2]">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
