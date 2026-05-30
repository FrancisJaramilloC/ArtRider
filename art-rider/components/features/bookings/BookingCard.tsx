"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { format, differenceInDays, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { getUnavailableDates } from "@/services/availabilityService";
import { getMyVerificationStatus, requiresVerification } from "@/services/identityService";
import { VerificationModal } from "@/components/features/identity/VerificationModal";

interface BookingCardProps {
  listingId: string;
  dailyPrice: number;
}

export function BookingCard({ listingId, dailyPrice }: BookingCardProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [disabledDates, setDisabledDates] = useState<Date[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // KYC State
  const [kycStatus, setKycStatus] = useState<"pending" | "verified" | "rejected" | "none">("none");
  const [needsKyc, setNeedsKyc] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getUnavailableDates(listingId).then((dateStrings) => {
      const localDates = dateStrings.map(d => {
        const [y, m, day] = d.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
      });
      setDisabledDates(localDates);
    });
    
    // Check KYC status and if this listing requires it
    const checkKyc = async () => {
      const status = await getMyVerificationStatus();
      setKycStatus(status);
      const reqKyc = await requiresVerification(dailyPrice);
      setNeedsKyc(reqKyc);
    };
    checkKyc();
  }, [listingId, dailyPrice]);

  const days = dateRange.from && dateRange.to
    ? Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1)
    : 0;

  const handleReserve = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    // Check Identity if required (Total amount >= $50.00)
    const totalAmount = dailyPrice * days;
    const requiresKyc = totalAmount >= 5000;

    if (requiresKyc && kycStatus !== "verified") {
      setShowKycModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/kushki/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "dummy-kushki-token",
          amount: totalAmount,
          listingId: listingId,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert(result.error || "Error al procesar el pago");
        setIsProcessing(false);
        return;
      }

      router.push(`/bookings/success?id=${result.bookingId}`);
    } catch (e: any) {
      alert(e.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl sticky top-28">
      <div className="flex items-end gap-1 mb-6">
        <span className="text-2xl font-bold text-gray-900">${(dailyPrice / 100).toFixed(2)}</span>
        <span className="text-gray-500 mb-1">/ día</span>
      </div>

      <div className="border border-gray-300 rounded-xl overflow-hidden mb-4">
        <button
          className="w-full flex items-center justify-between p-3 bg-white text-left hover:bg-gray-50 transition-colors"
          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-gray-800 tracking-wider">Fechas</span>
            <span className="text-sm text-gray-600 mt-1">
              {dateRange.from ? format(dateRange.from, "dd MMM yyyy", { locale: es }) : "Agregar fechas"}
              {dateRange.from && dateRange.to ? ` - ${format(dateRange.to, "dd MMM yyyy", { locale: es })}` : ""}
            </span>
          </div>
          <Calendar className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {isDatePickerOpen && (
        <div 
          className="mb-4 flex justify-center bg-white border border-gray-100 rounded-xl p-2 shadow-sm"
          style={{
            "--rdp-accent-color": "#875B9A",
            "--rdp-accent-background-color": "rgba(135, 91, 154, 0.1)",
            "--rdp-range_start-color": "white",
            "--rdp-range_start-background": "#875B9A",
            "--rdp-range_end-color": "white",
            "--rdp-range_end-background": "#875B9A",
            "--rdp-range_middle-color": "#875B9A",
            "--rdp-range_middle-background-color": "rgba(135, 91, 154, 0.1)",
            "--rdp-today-color": "#875B9A",
            "--rdp-selected-color": "#875B9A",
            "--rdp-selected-background-color": "rgba(135, 91, 154, 0.1)"
          } as React.CSSProperties}
        >
          <DayPicker
            mode="range"
            selected={dateRange as any}
            onSelect={(range: any) => {
              if (range?.from && range?.to) {
                const days = eachDayOfInterval({ start: range.from, end: range.to });
                const hasDisabled = days.some(day => 
                  disabledDates.some(disabledDate => isSameDay(day, disabledDate))
                );
                if (hasDisabled) {
                  setDateRange({ from: range.from, to: undefined });
                  return;
                }
              }
              setDateRange(range || { from: undefined, to: undefined });
            }}
            disabled={[{ before: new Date() }, ...disabledDates]}
            locale={es}
            numberOfMonths={1}
            className="font-sans text-sm"
            classNames={{
              day_selected: "!bg-[#875B9A]/10 !text-[#875B9A] font-bold hover:!bg-[#875B9A]/20",
              day_range_middle: "!bg-[#875B9A]/10 !text-[#875B9A] rounded-none",
              day_range_start: "!bg-[#875B9A]/20 !text-[#875B9A] hover:!bg-[#875B9A]/30 rounded-l-full",
              day_range_end: "!bg-[#875B9A]/20 !text-[#875B9A] hover:!bg-[#875B9A]/30 rounded-r-full",
              day_today: "font-bold !text-[#875B9A]",
              day: "h-9 w-9 p-0 font-normal hover:!bg-[#875B9A]/10 rounded-full transition-colors",
              nav_button: "text-[#875B9A] hover:bg-[#875B9A]/10 rounded-full p-1 transition-colors",
              nav_button_previous: "text-[#875B9A]",
              nav_button_next: "text-[#875B9A]",
            }}
          />
        </div>
      )}

      <button
        onClick={handleReserve}
        disabled={!dateRange.from || !dateRange.to || isProcessing}
        className="w-full bg-[#111111] hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-soft-premium disabled:shadow-none"
      >
        {isProcessing ? "Procesando Kushki..." : "Proceder al Pago (Kushki)"}
      </button>

      {days > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-gray-600 mb-2">
            <span>${(dailyPrice / 100).toFixed(2)} x {days} {days === 1 ? 'día' : 'días'}</span>
            <span>${((dailyPrice * days) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900 font-bold mt-4 pt-2 border-t border-gray-100">
            <span>Total aproximado</span>
            <span>${((dailyPrice * days) / 100).toFixed(2)}</span>
          </div>
        </div>
      )}

      <VerificationModal 
        isOpen={showKycModal} 
        onClose={() => setShowKycModal(false)}
        onVerified={() => {
          setShowKycModal(false);
          setKycStatus("verified");
          handleReserve();
        }}
      />
    </div>
  );
}
