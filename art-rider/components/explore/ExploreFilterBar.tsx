"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Volume2, Zap, Video, Sparkles, Megaphone, Package, LayoutGrid,
} from "lucide-react";

const FILTERS = [
  { value: "all",         label: "Todos",        Icon: LayoutGrid },
  { value: "audio",       label: "Sonido",       Icon: Volume2 },
  { value: "lighting",    label: "Iluminación",  Icon: Zap },
  { value: "video",       label: "Video",        Icon: Video },
  { value: "effects",     label: "Efectos",      Icon: Sparkles },
  { value: "advertising", label: "Publicidad",   Icon: Megaphone },
  { value: "other",       label: "Otro",         Icon: Package },
] as const;

export default function ExploreFilterBar({ city }: { city?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "all";

  const handleClick = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("category");
    } else {
      params.set("category", value);
    }
    if (city) params.set("city", city);
    router.push(`/explore?${params.toString()}`);
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-6 px-6 py-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {FILTERS.map(({ value, label, Icon }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              onClick={() => handleClick(value)}
              className={`flex flex-col items-center gap-1 min-w-fit pb-2 border-b-2 transition-all ${
                isActive
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
