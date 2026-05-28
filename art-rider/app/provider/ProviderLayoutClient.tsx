"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, CalendarDays, Package,
  DollarSign, HelpCircle, Settings,
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
      <Navbar initialUser={initialUser} hideNavLinks />

      {/*  Cuerpo de la pagina  */}
      <div className="flex-1 flex w-full">

        {/*  Barra lateral — top-16 = altura exacta del Navbar (h-16)  */}
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-100 fixed top-16 h-[calc(100vh-4rem)]">

          {/*  Brand strip  */}
          <div className="px-4 pt-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                <Store size={13} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-gray-900 truncate">{provider.brand_name}</p>
                <p className="text-[10px] text-gray-400">Proveedor</p>
              </div>
            </div>
          </div>

          {/*  Nav  */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1">
                  {section.label}
                </p>
                <div className="space-y-px">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon   = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                          active
                            ? "bg-slate-100 text-gray-900 font-semibold"
                            : "text-slate-500 hover:bg-slate-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon size={14} className={active ? "text-gray-900" : "text-slate-400"} />
                        {item.name}
                        {active && <span className="ml-auto w-1 h-1 rounded-full bg-gray-900" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/*  Bottom links  */}
          <div className="border-t border-slate-100 px-2 py-3 space-y-px">
            {BOTTOM_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-slate-500 hover:bg-slate-50 hover:text-gray-900 transition-all"
                >
                  <Icon size={14} className="text-slate-400" />
                  {item.name}
                </Link>
              );
            })}
          </div>

        </aside>

        {/*  Contenido principal  */}
        <main className="flex-1 min-w-0 md:ml-56 p-5 lg:p-7">
          <div className="max-w-screen-2xl mx-auto w-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
