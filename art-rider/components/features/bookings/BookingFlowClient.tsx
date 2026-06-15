"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Check, Clock, Phone, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KushkiPaymentForm from "./KushkiPaymentForm";

interface BookingFlowClientProps {
  listing: {
    id: string;
    title: string;
    description: string | null;
    price_per_day: number;
    provider?: { brand_name: string };
    cover_image_url?: string;
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

  const handleBooking = async (token: string) => {
    if (!initialStart || !initialEnd) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/kushki/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
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
    <div className="max-w-6xl mx-auto pb-32">
      <div className="flex items-center mb-10">
        <Link
          href={`/listings/${listing.id}`}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft-premium text-[#111111] hover:scale-105 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold text-[#111111] ml-6">Confirma y paga</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="space-y-8 animate-fade-up">
          <div className="bg-white p-8 rounded-[24px] shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-[#111111] mb-6">1. Agrega un método de pago</h2>
            
            <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  <div>
                    <span className="font-semibold text-[#111111]">Tarjeta de crédito o débito</span>
                    <div className="flex gap-1 mt-1 text-[10px] font-bold text-gray-500 uppercase">
                       <span className="px-1 border border-gray-200 rounded bg-white text-blue-800">VISA</span>
                       <span className="px-1 border border-gray-200 rounded bg-white text-red-600">Mastercard</span>
                       <span className="px-1 border border-gray-200 rounded bg-white text-blue-500">AMEX</span>
                       <span className="px-1 border border-gray-200 rounded bg-white text-gray-700">Diners</span>
                       <span className="px-1 border border-gray-200 rounded bg-white text-orange-500">Discover</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-1 bg-white">
                {isSubmitting ? (
                  <div className="p-4">
                    <button
                      disabled
                      className="w-full bg-[#111111] text-white font-bold py-5 rounded-2xl shadow-soft-premium disabled:opacity-70"
                    >
                      Procesando Pago...
                    </button>
                  </div>
                ) : (
                  <KushkiPaymentForm 
                    amount={priceCalc.total} 
                    onSuccess={handleBooking} 
                    onError={(err) => alert(err)} 
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="bg-white p-6 rounded-[24px] shadow-soft-premium border border-gray-100 sticky top-28">
            <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                {listing.cover_image_url ? (
                  <img src={listing.cover_image_url} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">Sin foto</div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#111111] leading-tight mb-1">{listing.title}</h3>
                <p className="text-sm text-[#8E8E93]">Ofrecido por {listing.provider?.brand_name || "Proveedor"}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-[#111111]">Detalles de la reserva</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8E8E93]">Fechas</span>
                <span className="font-medium text-[#111111] text-right">
                  {startDateObj && format(startDateObj, "d MMM", { locale: es })} –{" "}
                  {endDateObj && format(endDateObj, "d MMM", { locale: es })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8E8E93]">Duración</span>
                <span className="font-medium text-[#111111] text-right">{priceCalc.days} días</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3 mb-6">
              <h4 className="font-semibold text-[#111111]">Información del precio</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">${(priceCalc.dailyPrice / 100).toFixed(2)} x {priceCalc.days} días</span>
                <span className="text-[#111111]">${(priceCalc.total / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <span className="text-lg font-bold text-[#111111]">Total (USD)</span>
              <span className="text-2xl font-bold text-[#111111]">${(priceCalc.total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
