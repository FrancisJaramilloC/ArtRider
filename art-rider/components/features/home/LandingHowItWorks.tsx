import { Search, CalendarDays, Truck } from "lucide-react";

const STEPS = [
  {
    Icon: Search,
    n: 1,
    title: "Explora y compara",
    desc: "Encuentra sonido, luces y video de productores verificados cerca de ti.",
  },
  {
    Icon: CalendarDays,
    n: 2,
    title: "Reserva al instante",
    desc: "Elige tus fechas, revisa disponibilidad y paga seguro con SafeRider.",
  },
  {
    Icon: Truck,
    n: 3,
    title: "Recibe e instala",
    desc: "El equipo llega a tu evento con operador certificado incluido.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="max-w-[1240px] mx-auto px-8 mt-7 py-9">
      <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-gray-900 mb-6">
        Cómo funciona
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {STEPS.map(({ Icon, n, title, desc }) => (
          <div key={n} className="flex gap-4 items-start">
            {/* Icon box with number badge */}
            <div className="relative w-14 h-14 rounded-[17px] bg-[#875B9A]/[.08] flex items-center justify-center flex-shrink-0">
              <Icon size={26} strokeWidth={1.7} className="text-[#6a437a]" />
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white text-[12.5px] font-extrabold flex items-center justify-center border-2 border-white">
                {n}
              </span>
            </div>
            <div>
              <h3 className="text-[16px] font-bold tracking-[-0.01em] text-gray-900">{title}</h3>
              <p className="text-[14px] text-gray-400 font-medium leading-[1.5] mt-1.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
