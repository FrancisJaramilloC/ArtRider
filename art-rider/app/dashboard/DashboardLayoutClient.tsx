"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Heart } from "lucide-react";
import type { ProviderProfile } from "@/services/providerService";
import type { User } from "@supabase/supabase-js";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

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

  const navItems = [
    { name: "Mi Actividad", href: "/dashboard", icon: LayoutDashboard },
    { name: "Mis Reservas", href: "/dashboard/bookings", icon: CalendarDays },
    { name: "Favoritos", href: "/dashboard/favorites", icon: Heart },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Global Navbar ── */}
      <Navbar initialUser={initialUser} />

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="flex-1 flex w-full">

        {/* ── Left Sidebar ── */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto shrink-0">
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

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 p-6 lg:p-10">
          <div className="max-w-[1240px] mx-auto w-full">
            {children}
          </div>
        </main>

      </div>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
