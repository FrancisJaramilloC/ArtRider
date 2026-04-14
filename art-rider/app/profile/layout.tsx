import ProfileNav from "@/components/features/profile/ProfileNav";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Configuración de Cuenta | ArtRider",
  description: "Administra tu perfil, información pública y seguridad.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">

      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 flex justify-center">
        <div className="w-full max-w-7xl h-16 px-6 flex items-center justify-between">
          <ArtRiderLogo subtitle="Usuario" />

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[#875B9A] hover:text-white border border-[#875B9A] hover:bg-[#875B9A] px-4 py-2 rounded-full transition-colors"
            >
              <ChevronLeft size={16} />
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16 flex flex-col md:flex-row gap-10 lg:gap-14 w-full">
        
        {/* ── Left Sidebar Nav ── */}
        <aside className="w-full md:w-64 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 hidden md:block tracking-tight">Cuenta</h1>
          <ProfileNav />
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 max-w-2xl min-w-0">
          {children}
        </main>
        
      </div>
    </div>
  );
}
