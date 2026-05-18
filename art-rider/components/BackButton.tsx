"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Evita problemas de hidratación
  if (!mounted) return null;

  // No lo mostramos en el root principal ni en el home del dashboard
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/login" || pathname === "/register" || pathname === "/explore") {
    return null;
  }

  return (
    <button
      onClick={() => router.back()}
      className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-gray-200/50 text-gray-700 shadow-sm hover:bg-white transition-all text-sm font-semibold hover:scale-105"
      aria-label="Volver atrás"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Atrás</span>
    </button>
  );
}
