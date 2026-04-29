"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, CalendarDays, Package,
  DollarSign, ChevronLeft, HelpCircle, Settings,
} from "lucide-react";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";

// ── Nav structure ──────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "General",
    items: [
      { name: "Centro Operativo", href: "/provider",              icon: LayoutDashboard },
      { name: "Catálogo",         href: "/provider/catalog",      icon: Store           },
      { name: "Disponibilidad",   href: "/provider/inventory",    icon: Package         },
    ],
  },
  {
    label: "Negocio",
    items: [
      { name: "Reservas",  href: "/provider/bookingsProvider", icon: CalendarDays },
      { name: "Finanzas",  href: "/provider/finance",          icon: DollarSign   },
    ],
  },
];

const BOTTOM_LINKS = [
  { name: "Configuración", href: "/profile",  icon: Settings    },
  { name: "Ayuda",         href: "/help",     icon: HelpCircle  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function ProviderLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/provider" && pathname.startsWith(href + "/"));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 flex justify-center">
        <div className="w-full max-w-7xl h-16 px-6 flex items-center justify-between">
          <ArtRiderLogo subtitle="Proveedor" />
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[#875B9A] hover:text-white border border-[#875B9A] hover:bg-[#875B9A] px-4 py-2 rounded-full transition-colors"
            >
              <ChevronLeft size={16} />
              Navegar como Cliente
            </Link>
            <Link
              href="/profile"
              className="w-9 h-9 ml-2 rounded-full bg-gradient-to-br from-[#875B9A] to-[#6a437a] flex items-center justify-center shadow-md shrink-0 text-white font-bold text-sm hover:shadow-lg transition-shadow"
            >
              P
            </Link>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex w-full">

        {/* ── Sidebar ── */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-[calc(100vh-64px)]">

          {/* Brand strip */}
          <div className="px-5 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#875B9A] to-[#6a437a] flex items-center justify-center shrink-0">
                <Store size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">Panel de Proveedor</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Gestiona tu negocio</p>
              </div>
            </div>
          </div>

          {/* Nav sections */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-2">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon   = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                          active
                            ? "bg-purple-50 text-[#6a437a]"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            active ? "bg-[#6a437a] text-white" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <Icon size={15} />
                        </span>
                        <span className={active ? "font-semibold" : ""}>{item.name}</span>
                        {active && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6a437a]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom links */}
          <div className="border-t border-gray-100 px-3 py-4 space-y-0.5">
            {BOTTOM_LINKS.map((item) => {
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

          </div>

        </aside>

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 md:ml-64 p-6 lg:p-10">
          <div className="max-w-[1240px] mx-auto w-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
