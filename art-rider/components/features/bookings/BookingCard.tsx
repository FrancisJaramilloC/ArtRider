"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
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

  const router = useRouter();

  useEffect(() => {
    getUnavailableDates(listingId).then(setDisabledDates);
    
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
    ? Math.max(1, differenceInDays(dateRange.to, dateRange.from))
    : 0;

  const handleReserve = () => {
    if (!dateRange.from || !dateRange.to) return;
    
    // Check Identity if required
    if (needsKyc && kycStatus !== "verified") {
      setShowKycModal(true);
      return;
    }

    const startStr = dateRange.from.toISOString().split("T")[0];
    const endStr = dateRange.to.toISOString().split("T")[0];
    router.push(`/bookings/new?listing=${listingId}&start=${startStr}&end=${endStr}`);
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
        <div className="mb-4 flex justify-center bg-white border border-gray-100 rounded-xl p-2 shadow-sm">
          <DayPicker
            mode="range"
            selected={dateRange as any}
            onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
            disabled={[{ before: new Date() }, ...disabledDates]}
            locale={es}
            numberOfMonths={1}
            className="font-sans text-sm"
            classNames={{
              day_selected: "bg-[#875B9A] text-white hover:bg-[#6a437a] focus:bg-[#875B9A]",
              day_today: "font-bold text-[#875B9A]",
              day: "h-9 w-9 p-0 font-normal hover:bg-gray-100 rounded-full",
            }}
          />
        </div>
      )}

      <button
        onClick={handleReserve}
        disabled={!dateRange.from || !dateRange.to}
        className="w-full bg-[#875B9A] hover:bg-[#6a437a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-md disabled:shadow-none"
      >
        Reservar
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
