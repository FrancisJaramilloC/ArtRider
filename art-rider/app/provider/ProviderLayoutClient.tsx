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
      <Navbar initialUser={initialUser} hideNavLinks logoSubtitle={provider.brand_name} />

      {/*  Cuerpo de la pagina  */}
      <div className="flex-1 flex w-full">

        {/*  Barra lateral  */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed top-24 h-[calc(100vh-6rem)]">

          {/*  Barra de la empresa  */}
          <div className="px-5 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
                <Store size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{provider.brand_name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Panel de Proveedor</p>
              </div>
            </div>
          </div>

          {/*  Secciones de navegacion  */}
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
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <Icon size={15} />
                        </span>
                        <span className={active ? "font-semibold" : ""}>{item.name}</span>
                        {active && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-900" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/*  Enlaces de la parte inferior  */}
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

        {/*  Contenido principal  */}
        <main className="flex-1 min-w-0 md:ml-64 p-6 lg:p-10">
          <div className="max-w-[1240px] mx-auto w-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
