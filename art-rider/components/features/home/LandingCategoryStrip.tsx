import Link from "next/link";
import { LayoutGrid, Volume2, Zap, Video, Sparkles, Megaphone } from "lucide-react";

const CATS = [
  { id: "all",         label: "Todos",        Icon: LayoutGrid },
  { id: "audio",       label: "Sonido",       Icon: Volume2    },
  { id: "lighting",    label: "Iluminación",  Icon: Zap        },
  { id: "video",       label: "Video",        Icon: Video      },
  { id: "effects",     label: "Efectos",      Icon: Sparkles   },
  { id: "advertising", label: "Publicidad",   Icon: Megaphone  },
] as const;

export default function LandingCategoryStrip() {
  return (
    <nav
      id="cats"
      aria-label="Categorías"
      className="flex items-center gap-2 max-w-[1240px] mx-auto px-8 py-[14px] mt-2 border-b border-gray-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
    >
      {CATS.map(({ id, label, Icon }, i) => {
        const href = id === "all" ? "/explore" : `/explore?category=${id}`;
        return (
          <Link
            key={id}
            href={href}
            className={`flex items-center gap-2.5 px-[18px] py-[10px] rounded-full text-[14px] font-semibold whitespace-nowrap border transition-all flex-shrink-0 ${
              i === 0
                ? "bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white border-transparent shadow-[0_6px_16px_-6px_rgba(135,91,154,.5)]"
                : "text-gray-500 border-gray-200 hover:border-gray-800 hover:text-gray-900"
            }`}
          >
            <Icon
              size={18}
              strokeWidth={1.8}
              className={i === 0 ? "text-white" : "text-gray-400"}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
