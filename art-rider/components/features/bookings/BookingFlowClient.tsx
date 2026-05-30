"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Check, Clock, Phone, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BookingFlowClientProps {
  listing: {
    id: string;
    title: string;
    description: string | null;
    price_per_day: number;
    provider?: { brand_name: string };
  };
  initialStart?: string;
  initialEnd?: string;
  priceCalc: { total: number; days: number; dailyPrice: number };
}

export default function BookingFlowClient({
  listing,
  initialStart,
  initialEnd,
  priceCalc,
}: BookingFlowClientProps) {
  const router = useRouter();

  const [step, setStep] = useState<3 | 4>(3); // Empezamos directo en 3 (Resumen Ciego)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerRevealed, setProviderRevealed] = useState(false);

  const successRef = useRef<HTMLDivElement>(null);

  const handleBooking = async () => {
    if (!initialStart || !initialEnd) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/kushki/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "dummy-kushki-token", // Kushki.js generará esto
          amount: priceCalc.total,
          listingId: listing.id,
          startDate: initialStart,
          endDate: initialEnd,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert(result.error || "Error al procesar el pago");
        setIsSubmitting(false);
        return;
      }

      setStep(4);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);

      // Efecto Blur-to-Focus tras 600ms
      setTimeout(() => {
        setProviderRevealed(true);
      }, 600);
    } catch (e: any) {
      alert(e.message);
      setIsSubmitting(false);
    }
  };

  if (step === 4) {
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
            providerRevealed ? "blur-none opacity-100" : "blur-md opacity-50"
          }`}
        >
          <p className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-4">Información Revelada</p>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-xl font-bold text-[#111111]">
              {listing.provider?.brand_name.charAt(0).toUpperCase() || "P"}
            </div>
            <div>
              <p className="text-xl font-bold text-[#111111]">{listing.provider?.brand_name || "Proveedor"}</p>
              <p className="text-sm text-[#8E8E93]">Tel: +593 99 999 9999</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 bg-white text-[#111111] border border-gray-200 font-semibold py-3 rounded-xl hover:bg-gray-50 transition flex justify-center items-center gap-2">
              <Phone className="w-4 h-4" />
              Llamar
            </button>
            <button className="flex-1 bg-[#25D366] text-white font-semibold py-3 rounded-xl shadow-soft-premium hover:bg-[#20bd5a] transition flex justify-center items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>
        
        <Link href="/bookings" className="mt-8 text-[#8E8E93] hover:text-[#111111] font-medium underline">
          Ir a mis reservas
        </Link>
      </div>
    );
  }

  const startDateObj = initialStart ? new Date(initialStart) : null;
  const endDateObj = initialEnd ? new Date(initialEnd) : null;

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Navbar Minimalista */}
      <div className="flex items-center mb-12">
        <Link
          href={`/listings/${listing.id}`}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft-premium text-[#111111] hover:scale-105 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      </div>

      {/* Resumen Ciego Directo */}
      <div className="bg-white p-8 rounded-[24px] shadow-soft-premium mb-8 animate-fade-up relative overflow-hidden">
        {/* Ticket perforations */}
        <div className="absolute top-0 left-8 w-[calc(100%-4rem)] border-t-2 border-dashed border-gray-200" />
        
        <h2 className="text-2xl font-bold text-[#111111] text-center mt-4 mb-8">Resumen de Reserva</h2>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-[#8E8E93]">Servicio</span>
            <span className="font-semibold text-[#111111] text-right">{listing.title}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8E8E93]">Fechas</span>
            <span className="font-semibold text-[#111111] text-right">
              {startDateObj && format(startDateObj, "d MMM", { locale: es })} -{" "}
              {endDateObj && format(endDateObj, "d MMM", { locale: es })}
            </span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <span className="text-lg font-bold text-[#111111]">Total a pagar</span>
            <span className="text-2xl font-bold text-[#111111]">${(priceCalc.total / 100).toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleBooking}
          disabled={isSubmitting}
          className="w-full bg-[#111111] text-white font-bold py-5 rounded-2xl shadow-soft-premium hover:bg-black transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
        >
          {isSubmitting ? "Procesando..." : "Proceder al Pago (Kushki)"}
        </button>
      </div>
    </div>
  );
}
