"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, CalendarDays, Package,
  DollarSign, HelpCircle, Settings, Star,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import type { User } from "@supabase/supabase-js";

//  Estructura de navegacion del proveedor

const NAV_SECTIONS = [
  {
    label: "General", //  Seccion general
    items: [
      { name: "Centro Operativo", href: "/provider",              icon: LayoutDashboard },
      { name: "Catálogo",         href: "/provider/catalog",      icon: Store           },
      { name: "Disponibilidad",   href: "/provider/inventory",    icon: Package         },
    ],
  },
  {
    label: "Negocio", //  Seccion de negocio
    items: [
      { name: "Reservas",  href: "/provider/bookingsProvider", icon: CalendarDays },
      { name: "Reseñas",   href: "/provider/reviews",          icon: Star         },
      { name: "Finanzas",  href: "/provider/finance",          icon: DollarSign   },
    ],
  },
];

const BOTTOM_LINKS = [
  { name: "Configuración", href: "#",          icon: Settings    },
  { name: "Ayuda",         href: "/help",     icon: HelpCircle  },
];

//  Componente de la estructura de navegacion del proveedor
export default function ProviderLayoutClient({
  children,
  provider,
  initialUser,
}: {
  children: React.ReactNode;
  provider: { brand_name: string };
  initialUser: User | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/provider" && pathname.startsWith(href + "/"));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/*  Barra de navegacion  */}
      <Navbar initialUser={initialUser} initialIsProvider={!!provider} hideNavLinks />

      {/*  Cuerpo de la pagina  */}
      <div className="flex-1 flex w-full">

        {/*  Barra lateral — top-16 = altura exacta del Navbar (h-16)  */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 fixed top-16 h-[calc(100vh-4rem)]">

          {/*  Brand strip  */}
          <div className="px-5 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                <Store size={15} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-gray-900 truncate">{provider.brand_name}</p>
                <p className="text-[11px] text-gray-400">Proveedor</p>
              </div>
            </div>
          </div>

          {/*  Nav  */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-2">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon   = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          active
                            ? "bg-slate-100 text-gray-900 font-semibold"
                            : "text-slate-500 hover:bg-slate-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon size={18} className={active ? "text-gray-900" : "text-slate-400"} />
                        {item.name}
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-900" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/*  Bottom links  */}
          <div className="border-t border-slate-100 px-3 py-4 space-y-1">
            {BOTTOM_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-gray-900 transition-all"
                >
                  <Icon size={18} className="text-slate-400" />
                  {item.name}
                </Link>
              );
            })}
          </div>

        </aside>

        {/*  Contenido principal  */}
        <main className="flex-1 min-w-0 md:ml-64 p-5 lg:p-8">
          <div className="max-w-screen-2xl mx-auto w-full transition-all duration-700 ease-out animate-in fade-in slide-in-from-bottom-4" style={{ animationName: `enter-${pathname.replace(/[^a-zA-Z0-9]/g, '')}` }}>
            {/* Truco CSS: Al cambiar el animationName basado en el pathname, forzamos a que la animación se repita sin destruir el DOM */}
            <style>{`
              @keyframes enter-${pathname.replace(/[^a-zA-Z0-9]/g, '')} {
                from { opacity: 0; transform: translateY(16px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
