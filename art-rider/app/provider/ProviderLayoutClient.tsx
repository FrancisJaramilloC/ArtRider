"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, CalendarDays, Package,
  DollarSign, HelpCircle, Star, MessageSquare,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import type { User } from "@supabase/supabase-js";
import type { ProviderProfile } from "@/services/providerService";

function brandInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const NAV_SECTIONS = [
  {
    label: "General",
    items: [
      { name: "Centro Operativo", href: "/provider",           icon: LayoutDashboard },
      { name: "Catálogo",         href: "/provider/catalog",   icon: Store           },
      { name: "Disponibilidad",   href: "/provider/inventory", icon: Package         },
      // Mensajes se inyecta dinámicamente abajo con el badge
    ],
  },
  {
    label: "Negocio",
    items: [
      { name: "Reservas", href: "/provider/bookingsProvider", icon: CalendarDays },
      { name: "Reseñas",  href: "/provider/reviews",          icon: Star         },
      { name: "Finanzas", href: "/provider/finance",          icon: DollarSign   },
    ],
  },
];

export default function ProviderLayoutClient({
  children,
  provider,
  initialUser,
  unreadMessages = 0,
}: {
  children: React.ReactNode;
  provider: ProviderProfile;
  initialUser: User | null;
  unreadMessages?: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/provider" && pathname.startsWith(href + "/"));

  const ini = brandInitials(provider.brand_name);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f4f7]">

      {/*  Barra de navegacion  */}
      <Navbar initialUser={initialUser} initialIsProvider={!!provider} hideNavLinks />

      <div className="flex-1 flex w-full">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 fixed top-16 h-[calc(100vh-4rem)] overflow-y-auto">

          {/* Profile block */}
          <div className="px-4 pt-[22px] pb-2">
            <div className="flex items-center gap-3 p-3 border border-[#e1dde7] rounded-2xl bg-white shadow-[0_4px_16px_-8px_rgba(22,19,28,.18),0_1px_2px_rgba(22,19,28,.05)]">
              <div
                suppressHydrationWarning
                className="w-[46px] h-[46px] rounded-[13px] bg-white border border-gray-900 flex items-center justify-center flex-shrink-0 text-gray-900 text-[18px] font-extrabold tracking-tight select-none"
              >
                {ini}
              </div>
              <div className="min-w-0">
                <p className="text-[14.5px] font-extrabold text-gray-900 tracking-tight truncate leading-snug">
                  {provider.brand_name}
                </p>
                <span
                  suppressHydrationWarning
                  className="inline-flex items-center gap-[6px] text-[10.5px] font-extrabold tracking-[.04em] uppercase text-gray-900 bg-white border border-gray-900 px-[10px] py-[4px] rounded-full mt-[5px]"
                >
                  <span className="w-[6px] h-[6px] rounded-full bg-gray-900 flex-shrink-0" />
                  Proveedor
                </span>
              </div>
            </div>
          </div>

          {/* Nav sections */}
          <nav className="flex-1 px-3 py-3 space-y-5">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[#837d8e] px-3 pb-2">
                  {section.label}
                </p>
                <div className="space-y-[2px]">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-[13px] py-[10px] rounded-xl text-[14.5px] font-semibold transition-all border ${
                          active
                            ? "bg-white text-[#875B9A] font-bold border-gray-900 shadow-[0_1px_2px_rgba(22,19,28,.06)]"
                            : "text-[#3b3947] border-transparent hover:bg-[#f5f4f7] hover:text-gray-900"
                        }`}
                      >
                        <Icon
                          size={19}
                          className={active ? "text-[#875B9A]" : "text-[#3b3947]"}
                          strokeWidth={active ? 2 : 1.7}
                        />
                        {item.name}
                        {active && (
                          <span className="ml-auto w-[7px] h-[7px] rounded-full bg-gray-900 flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}

                  {/* Mensajes — solo en General section */}
                  {section.label === "General" && (
                    <Link
                      href="/provider/mensajes"
                      className={`flex items-center gap-3 px-[13px] py-[10px] rounded-xl text-[14.5px] font-semibold transition-all border ${
                        isActive("/provider/mensajes")
                          ? "bg-white text-[#875B9A] font-bold border-gray-900 shadow-[0_1px_2px_rgba(22,19,28,.06)]"
                          : "text-[#3b3947] border-transparent hover:bg-[#f5f4f7] hover:text-gray-900"
                      }`}
                    >
                      <MessageSquare
                        size={19}
                        className={isActive("/provider/mensajes") ? "text-[#875B9A]" : "text-[#3b3947]"}
                        strokeWidth={isActive("/provider/mensajes") ? 2 : 1.7}
                      />
                      Mensajes
                      {unreadMessages > 0 && !isActive("/provider/mensajes") && (
                        <span className="ml-auto text-[11px] font-extrabold min-w-[19px] h-[19px] rounded-full bg-[#f2f1f5] text-[#46414f] grid place-items-center px-[6px]">
                          {unreadMessages > 99 ? "99+" : unreadMessages}
                        </span>
                      )}
                      {isActive("/provider/mensajes") && (
                        <span className="ml-auto w-[7px] h-[7px] rounded-full bg-gray-900 flex-shrink-0" />
                      )}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </nav>

          {/* Help */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-[11px] p-3 border border-[#eceaef] rounded-xl text-[13px] text-[#46414f] font-semibold bg-[#f5f4f7]">
              <HelpCircle size={19} className="text-[#C026D3] flex-shrink-0" strokeWidth={1.7} />
              ¿Necesitas ayuda?
            </div>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 md:ml-64 p-5 lg:p-8">
          <div
            className="max-w-screen-2xl mx-auto w-full transition-all duration-700 ease-out animate-in fade-in slide-in-from-bottom-4"
            style={{ animationName: `enter-${pathname.replace(/[^a-zA-Z0-9]/g, "")}` }}
          >
            <style>{`
              @keyframes enter-${pathname.replace(/[^a-zA-Z0-9]/g, "")} {
                from { opacity: 0; transform: translateY(16px); }
                to   { opacity: 1; transform: translateY(0);    }
              }
            `}</style>
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
