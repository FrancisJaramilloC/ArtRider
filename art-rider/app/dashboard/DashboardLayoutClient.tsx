"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Heart,
  ChevronRight, HelpCircle, Settings, Sparkles,
} from "lucide-react";
import type { ProviderProfile } from "@/services/providerService";
import type { User } from "@supabase/supabase-js";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// ── Nav structure ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { name: "Mi Actividad", href: "/dashboard",           icon: LayoutDashboard },
  { name: "Mis Reservas", href: "/dashboard/bookings",  icon: CalendarDays    },
  { name: "Favoritos",    href: "/dashboard/favorites", icon: Heart           },
];

const BOTTOM_LINKS = [
  { name: "Configuración", href: "/profile", icon: Settings   },
  { name: "Ayuda",         href: "/help",    icon: HelpCircle },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardLayoutClient({
  children,
  provider,
  initialUser = null,
}: {
  children: React.ReactNode;
  provider: ProviderProfile | null;
  initialUser?: User | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 flex justify-center">
        <div className="w-full max-w-7xl h-16 px-6 flex items-center justify-between">
          <ArtRiderLogo subtitle="Usuario" />

          <div className="flex items-center gap-4">
            {provider ? (
               <Link
               href="/provider"
               className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[#875B9A] hover:text-white border border-[#875B9A] hover:bg-[#875B9A] px-4 py-2 rounded-full transition-colors"
             >
               Cambiar a modo proveedor
               <ChevronRight size={16} />
             </Link>
            ) : (
              <Link
                href="/become-a-provider"
                className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[#875B9A] hover:text-white border border-[#875B9A] hover:bg-[#875B9A] px-4 py-2 rounded-full transition-colors"
              >
                Ser proveedor
                <ChevronRight size={16} />
              </Link>
            )}

            <Link
              href="/profile"
              className="w-9 h-9 ml-2 rounded-full bg-gradient-to-br from-[#875B9A] to-[#6a437a] flex items-center justify-center shadow-md shrink-0 cursor-pointer text-white font-bold text-sm hover:shadow-lg transition-shadow"
            >
              U
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="flex-1 flex w-full">
        
        {/* ── Left Sidebar ── */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-[calc(100vh-64px)] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all"
                >
                  <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-gray-400" />
                  </span>
                  {item.name}
                </Link>
              );
            })}

            {/* CTA — only show for non-providers */}
            {!provider && (
              <div className="mt-3 mx-1 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl px-3 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={13} className="text-[#6a437a] shrink-0" />
                  <p className="text-xs font-bold text-gray-800">¿Tienes equipos?</p>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                  Publica tu equipo y empieza a generar ingresos.
                </p>
                <Link
                  href="/become-a-provider"
                  className="block text-center text-[11px] font-bold text-white bg-[#6a437a] hover:bg-[#5c3569] rounded-lg py-2 transition-colors"
                >
                  Ser proveedor
                </Link>
              </div>
            )}
          </div>

        </aside>

        {/* ── Dashboard Content ── */}
        <main className="flex-1 min-w-0 md:ml-64 p-6 lg:p-10">
          <div className="max-w-[1240px] mx-auto w-full">
            {children}
          </div>
        </main>

      </div>
    
    </div>
  );
}
