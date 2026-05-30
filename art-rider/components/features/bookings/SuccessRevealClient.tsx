"use client";

import { useEffect, useState, useRef } from "react";
import { Check } from "lucide-react";
import Link from "next/link";

interface SuccessRevealClientProps {
  providerName: string;
  providerAvatar: string | null;
  providerPhone: string | null;
}

export default function SuccessRevealClient({
  providerName,
  providerAvatar,
}: SuccessRevealClientProps) {
  const [revealed, setRevealed] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealed(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-fade-in" ref={successRef}>
      <div className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center mb-8 shadow-soft-premium animate-scale-in">
        <Check className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-bold text-[#111111] mb-2 text-center">¡Solicitud Enviada!</h2>
      <p className="text-[#8E8E93] text-center max-w-md mb-12">
        El proveedor revisará tu solicitud y la confirmará pronto.
      </p>

      <div
        className={`w-full max-w-md bg-[#F0FDF4] p-8 rounded-[24px] shadow-soft-premium transition-all duration-700 ease-in-out ${
          revealed ? "blur-none opacity-100" : "blur-md opacity-50"
        }`}
      >
        <p className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-4">Información Revelada</p>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden">
            {providerAvatar ? (
              <img src={providerAvatar} alt={providerName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-[#111111]">
                {providerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-xl font-bold text-[#111111]">{providerName}</p>
            <p className="text-sm text-[#8E8E93]">Proveedor ArtRider</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#D1FAE5]">
          <p className="text-sm font-semibold text-[#111111] text-center opacity-80">
            La mensajería interna estará disponible muy pronto.
          </p>
        </div>
      </div>
      
      <Link href="/bookings" className="mt-8 text-[#8E8E93] hover:text-[#111111] font-medium underline">
        Ir a mis reservas
      </Link>
    </div>
  );
}
