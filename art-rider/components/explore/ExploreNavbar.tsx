"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Search, SlidersHorizontal, MapPin } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";

interface ExploreNavbarProps {
  city: string | undefined;
  count: number;
}

export default function ExploreNavbar({ city, count }: ExploreNavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const userInitial = (
    user?.user_metadata?.display_name?.charAt(0) ||
    user?.user_metadata?.full_name?.charAt(0) ||
    user?.email?.charAt(0) ||
    "U"
  ).toUpperCase();

  return (
    <nav className="flex-shrink-0 bg-white border-b border-gray-100 z-30 relative">
      <div className="h-20 px-6 flex items-center gap-4">

        {/* ── Left: back + logo ── */}
        <div className="flex items-center gap-3 shrink-0 w-[200px]">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors shrink-0"
            aria-label="Volver atrás"
          >
            <ArrowLeft size={15} strokeWidth={2} />
          </button>
          <ArtRiderLogo />
        </div>

        {/* ── Center: search pill ── */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-stretch h-12 rounded-full border border-gray-200 shadow-sm bg-white overflow-hidden w-full max-w-[500px]">

            {/* City */}
            <div className="flex items-center gap-1.5 pl-5 pr-4 border-r border-gray-100 shrink-0">
              <MapPin size={12} strokeWidth={2} className="text-gray-400" />
              <span className="text-[13px] font-semibold text-gray-800 whitespace-nowrap">
                {city ?? "Ecuador"}
              </span>
            </div>

            {/* Category */}
            <div className="flex-1 flex items-center px-4 min-w-0">
              <span className="text-[13px] text-gray-400 truncate">
                Cualquier categoría
              </span>
            </div>

            {/* Divider + count */}
            <div className="hidden md:flex items-center px-4 border-l border-gray-100 shrink-0">
              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                {count} {count === 1 ? "equipo" : "equipos"}
              </span>
            </div>

            {/* Search button */}
            <div className="flex items-center px-1.5">
              <button
                className="w-9 h-9 rounded-full bg-[#875B9A] flex items-center justify-center hover:bg-[#6a437a] transition-colors shrink-0"
                aria-label="Buscar"
              >
                <Search size={14} strokeWidth={2.5} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: filters + user ── */}
        <div className="flex items-center gap-3 shrink-0 w-[200px] justify-end">
          <button
            className="flex items-center gap-1.5 px-4 h-9 rounded-full border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap"
            aria-label="Filtros"
          >
            <SlidersHorizontal size={12} strokeWidth={2} />
            Filtros
          </button>

          {user ? (
            <Link
              href="/profile"
              className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-[13px] font-bold hover:bg-gray-700 transition-colors shrink-0"
              aria-label="Perfil"
            >
              {userInitial}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[13px] font-semibold text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap"
            >
              Entrar
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
