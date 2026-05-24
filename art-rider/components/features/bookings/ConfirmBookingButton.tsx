"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createBooking } from "@/services/bookingsService";

interface ConfirmBookingButtonProps {
  listingId: string;
  start: string;
  end: string;
}

export function ConfirmBookingButton({ listingId, start, end }: ConfirmBookingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleConfirm = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await createBooking(listingId, start, end);
      
      if (result.error) {
        setError(result.error);
        return;
      }

      // Success! Redirigir a la lista de reservas
      router.push("/bookings");
      router.refresh(); // Para asegurar que la vista del server se actualice
    } catch (e: any) {
      setError(e.message || "Ocurrió un error al reservar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 text-sm text-red-800 bg-red-50 rounded-xl">
          {error}
        </div>
      )}
      
      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 bg-[#875B9A] hover:bg-[#6a437a] text-white font-bold py-4 px-10 rounded-xl transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Confirmando...</span>
          </>
        ) : (
          <span>Confirmar reserva</span>
        )}
      </button>
    </div>
  );
}
