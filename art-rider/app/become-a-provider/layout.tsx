import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conviértete en Proveedor | ArtRider",
  description: "Únete a ArtRider y comienza a ganar dinero alquilando tus equipos audiovisuales a otros creadores.",
};

export default function BecomeProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Immersive Header (Airbnb Setup style) */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-6 h-[80px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-gray-900 group-hover:bg-[#875B9A] transition-colors text-white text-sm shrink-0">
              🎧
            </div>
            <span className="font-extrabold text-[1.125rem] text-gray-900 tracking-tight hidden sm:block">
              ArtRider
            </span>
          </Link>
          
          <Link
            href="/"
            className="text-[0.9rem] font-semibold text-gray-700 hover:text-gray-900 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            Salir
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
