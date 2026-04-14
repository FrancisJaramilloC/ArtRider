"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, CalendarDays, Package, DollarSign, ChevronLeft } from "lucide-react";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";

export default function ProviderLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Centro Operativo", href: "/provider", icon: LayoutDashboard },
    { name: "Catálogo", href: "/provider/catalog", icon: Store },
    { name: "Disponibilidad", href: "/provider/inventory", icon: Package },
    { name: "Reservas", href: "/provider/bookingsProvider", icon: CalendarDays },
    { name: "Finanzas", href: "/provider/finance", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* ── Top Navbar ── */}
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
              className="w-9 h-9 ml-2 rounded-full bg-gradient-to-br from-[#875B9A] to-[#6a437a] flex items-center justify-center shadow-md shrink-0 cursor-pointer text-white font-bold text-sm hover:shadow-lg transition-shadow"
            >
              P
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
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-purple-50 text-[#875B9A]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-[#875B9A]" : "text-gray-400"} />
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
