"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Heart, ChevronRight } from "lucide-react";
import type { ProviderProfile } from "@/services/providerService";

export default function DashboardLayoutClient({
  children,
  provider,
}: {
  children: React.ReactNode;
  provider: ProviderProfile | null;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Mi Actividad", href: "/dashboard", icon: LayoutDashboard },
    { name: "Mis Reservas", href: "/dashboard/bookings", icon: CalendarDays },
    { name: "Favoritos", href: "/dashboard/favorites", icon: Heart },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 flex justify-center">
        <div className="w-full max-w-7xl h-16 px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#875B9A] text-white text-xs shrink-0 font-bold">
              AR
            </div>
            <span className="font-extrabold text-lg text-gray-900 tracking-tight">
              ArtRider
            </span>
          </Link>

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

            <div className="w-9 h-9 ml-2 rounded-full bg-gray-200 flex items-center justify-center shadow-inner shrink-0 cursor-pointer text-gray-600 font-bold text-sm">
              U
            </div>
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
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-gray-900" : "text-gray-400"} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
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
