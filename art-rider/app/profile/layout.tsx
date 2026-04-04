import ProfileNav from "@/components/features/profile/ProfileNav";
import type { Metadata } from "next";

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
    <div className="bg-gray-50/50 min-h-[calc(100vh-80px)] w-full">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16 flex flex-col md:flex-row gap-10 lg:gap-14">
        
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
