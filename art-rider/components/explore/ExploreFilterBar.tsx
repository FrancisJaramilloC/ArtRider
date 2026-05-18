"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Music2, Zap, Video, Sparkles, Package, Megaphone,
  LayoutGrid, SlidersHorizontal,
} from "lucide-react";

const CATEGORIES = [
  { key: "all",         label: "Todos",        Icon: LayoutGrid },
  { key: "audio",       label: "Sonido",        Icon: Music2     },
  { key: "lighting",    label: "Iluminación",   Icon: Zap        },
  { key: "video",       label: "Video",         Icon: Video      },
  { key: "effects",     label: "Efectos",       Icon: Sparkles   },
  { key: "advertising", label: "Publicidad",    Icon: Megaphone  },
  { key: "other",       label: "Otro",          Icon: Package    },
] as const;

export default function ExploreFilterBar({ city }: { city?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "all";

  const go = (key: string) => {
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    if (key !== "all") p.set("category", key);
    router.push(`/explore?${p.toString()}`);
  };

  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-100">
      <div className="max-w-full px-6 h-[66px] flex items-end gap-0">

        {/* ── Category tabs ── */}
        <div className="flex items-end flex-1 gap-6 overflow-x-auto scrollbar-hide pb-0 min-w-0">
          {CATEGORIES.map(({ key, label, Icon }) => {
            const isActive = key === activeCategory;
            return (
              <button
                key={key}
                onClick={() => go(key)}
                className={`
                  group flex flex-col items-center gap-[5px] pb-3 pt-1
                  shrink-0 border-b-2 transition-all duration-150 cursor-pointer
                  ${isActive
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
                  }
                `}
              >
                <Icon size={22} strokeWidth={1.5} />
                <span className="text-[11.5px] font-medium whitespace-nowrap tracking-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Divider ── */}
        <div className="mx-5 mb-3 h-7 w-px bg-gray-200 shrink-0" />

        {/* ── Filtros ── */}
        <button
          className="mb-3 flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-[12.5px] font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0 whitespace-nowrap"
          aria-label="Filtros"
        >
          <SlidersHorizontal size={13} strokeWidth={2} />
          Filtros
        </button>

      </div>
    </div>
  );
}
