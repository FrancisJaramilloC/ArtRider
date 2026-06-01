"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ShieldCheck, Headphones, BadgeCheck } from "lucide-react";

interface LandingHeroProps {
  cities: string[];
}

export default function LandingHero({ cities }: LandingHeroProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(cities[0] ?? "");
  const [cityOpen, setCityOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    router.push(`/explore?${params.toString()}`);
  }

  const trust = [
    { Icon: BadgeCheck,   label: "Proveedores verificados" },
    { Icon: ShieldCheck,  label: "Pago protegido SafeRider" },
    { Icon: Headphones,   label: "Soporte 24/7" },
  ];

  return (
    <section className="max-w-[760px] mx-auto px-6 pt-[54px] pb-[30px] text-center">
      <h1 className="text-[46px] font-extrabold tracking-[-0.03em] leading-[1.08] text-gray-900" style={{ textWrap: "balance" } as React.CSSProperties}>
        Encuentra el equipo perfecto para{" "}
        <span className="bg-gradient-to-r from-[#875B9A] to-[#6a437a] bg-clip-text text-transparent">
          tu evento
        </span>
      </h1>

      <p className="text-[16px] text-gray-400 font-medium mt-4 max-w-[560px] mx-auto leading-[1.55]" style={{ textWrap: "pretty" } as React.CSSProperties}>
        Audio, iluminación, video y efectos profesionales. Renta directo de productores locales verificados en todo el Ecuador.
      </p>

      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2.5 mt-7 mx-auto max-w-[660px] h-[62px] px-2 pl-[22px] bg-white border border-gray-200 rounded-full shadow-[0_12px_34px_-10px_rgba(22,19,28,.22),0_2px_6px_rgba(22,19,28,.06)] focus-within:shadow-[0_16px_40px_-12px_rgba(135,91,154,.3),0_0_0_2px_rgba(135,91,154,.15)] transition-shadow"
      >
        <Search size={20} strokeWidth={2} className="text-gray-500 flex-shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="¿Qué equipo o paquete buscas?"
          className="flex-1 border-none outline-none text-[15.5px] font-medium text-gray-900 placeholder:text-gray-400 bg-transparent min-w-0"
        />

        {/* Divider */}
        <div className="w-px h-[30px] bg-gray-200 flex-shrink-0" />

        {/* City picker */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setCityOpen(o => !o)}
            className="flex items-center gap-1.5 text-[14px] font-bold text-gray-900 px-3 py-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            <MapPin size={15} strokeWidth={1.9} className="text-[#875B9A]" />
            {city || "Ciudad"}
          </button>
          {cityOpen && cities.length > 0 && (
            <div className="absolute top-[calc(100%+8px)] left-0 z-50 bg-white border border-gray-100 rounded-2xl shadow-[0_12px_34px_-10px_rgba(22,19,28,.22)] py-1.5 min-w-[160px]">
              {cities.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCity(c); setCityOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                    c === city ? "text-[#875B9A] bg-[#875B9A]/[0.06]" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search button */}
        <button
          type="submit"
          className="flex-shrink-0 h-[46px] px-6 bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white text-[15px] font-bold rounded-full shadow-[0_8px_20px_-8px_rgba(135,91,154,.6)] hover:brightness-105 active:scale-[.97] transition-all"
        >
          Buscar
        </button>
      </form>

      {/* Trust badges */}
      <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-6">
        {trust.map(({ Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600">
            <Icon size={15} className="text-[#875B9A]" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
