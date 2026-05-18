"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Search, SlidersHorizontal, MapPin } from "lucide-react";

interface ExploreHeaderProps {
  city: string | undefined;
  count: number;
}

export default function ExploreHeader({ city, count }: ExploreHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex-shrink-0 bg-white border-b border-gray-100 z-20 relative">
      <div className="px-4 pt-3 pb-2.5 flex items-center gap-2.5">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex-shrink-0 w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          aria-label="Volver atrás"
        >
          <ArrowLeft size={15} strokeWidth={2} />
        </button>

        {/* Floating pill */}
        <div className="flex-1 flex items-stretch rounded-full border border-gray-200 shadow-sm bg-white overflow-hidden h-11 min-w-0">

          {/* City segment */}
          <div className="flex items-center gap-1.5 pl-4 pr-3.5 border-r border-gray-100 flex-shrink-0">
            <MapPin size={12} strokeWidth={2} className="text-gray-400" />
            <span className="text-[13px] font-semibold text-gray-800 whitespace-nowrap">
              {city ?? "Ecuador"}
            </span>
          </div>

          {/* Category label (static) */}
          <div className="flex-1 flex items-center px-4 min-w-0">
            <span className="text-[13px] text-gray-400 truncate">
              Cualquier categoría
            </span>
          </div>

          {/* Search CTA */}
          <div className="flex items-center pr-1.5 pl-1">
            <button
              className="w-8 h-8 rounded-full bg-[#875B9A] flex items-center justify-center hover:bg-[#6a437a] transition-colors"
              aria-label="Buscar"
            >
              <Search size={13} strokeWidth={2.5} className="text-white" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <button
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 h-9 rounded-full border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap"
          aria-label="Filtros"
        >
          <SlidersHorizontal size={12} strokeWidth={2} />
          Filtros
        </button>
      </div>

      {/* Count */}
      <div className="px-4 pb-2.5 pl-[60px]">
        <p className="text-[11px] font-medium text-gray-400">
          {count === 0
            ? "Sin resultados"
            : `${count} ${count === 1 ? "equipo disponible" : "equipos disponibles"}`}
        </p>
      </div>
    </header>
  );
}
