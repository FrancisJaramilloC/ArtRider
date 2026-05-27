"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";
import { cancelBooking } from "@/services/bookingsService";

// Configuración de estados de reserva
const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  AWAITING_SIGNATURES: { label: "Pendiente",          className: "bg-[#F9F5FB] text-[#875B9A]" },
  PAID:               { label: "Pagado",            className: "bg-blue-50 text-blue-700"  },
  ACTIVE:             { label: "Activo",             className: "bg-emerald-50 text-emerald-700" },
  COMPLETED:          { label: "Completado",         className: "bg-violet-50 text-violet-700"  },
  DISPUTE:            { label: "En disputa",         className: "bg-red-50 text-red-700"   },
  CANCELLED:          { label: "Cancelado",          className: "bg-gray-100 text-gray-500" },
  ARCHIVED:           { label: "Archivado",          className: "bg-gray-100 text-gray-400" },
};

// Formateo de fechas
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  
  // If it's a timestamp (like created_at), parse normally
  if (dateStr.includes("T")) {
    return new Date(dateStr).toLocaleDateString("es-EC", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Literal date YYYY-MM-DD
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const localDate = new Date(year, month, day);
    return localDate.toLocaleDateString("es-EC", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  
  return dateStr;
}

// Props de la sección de reservas del cliente
interface ClientBookingsSectionProps {
  bookings: BookingWithDetails[];
}

// Componente de la sección de reservas del cliente
export default function ClientBookingsSection({ bookings }: ClientBookingsSectionProps) {
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async (bookingId: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta reserva?")) return;
    setIsCancelling(bookingId);
    try {
      const res = await cancelBooking(bookingId);
      if (res.error) {
        alert("Error: " + res.error);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert("Ocurrió un error inesperado al cancelar.");
    } finally {
      setIsCancelling(null);
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900">Mis Alquileres</h2>
      <p className="text-sm text-gray-500 mt-1">
        Equipos de audio e iluminacion que has reservado
      </p>
      {/* Renderizado de la lista de reservas */}
      {bookings.length === 0 ? ( // Si no hay reservas
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 mt-6">
          <p className="text-gray-500 font-medium">No tienes alquileres activos</p>
          <p className="text-gray-400 text-sm mt-1">Explora nuestros equipos disponibles</p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-2.5 bg-[#6a437a] text-white text-sm font-semibold rounded-full hover:bg-[#5c3569] transition-colors"
          >
            Ver equipos
          </Link>
        </div>
      ) : ( // Si hay reservas
        <div className="space-y-4 mt-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:-translate-y-px transition-transform duration-150 ease-in-out"
            >
              <div className="flex justify-between items-start">
                <div>
                  {booking.booking_units.map((u) => (
                    <span key={u.id} className="block text-sm font-medium text-gray-800">
                      {u.quantity}x {u.listing?.title ?? "Equipo"}
                    </span>
                  ))}
                </div>
                <span
                  className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[booking.status].className}`}
                >
                  {STATUS_CONFIG[booking.status].label}
                </span>
              </div>

              {/* Renderizado de la información de la reserva */}
              <div className="mt-3 flex justify-between items-end">
                <span className="text-sm text-gray-500">
                  {formatDate(booking.start_date)} &rarr; {formatDate(booking.end_date)}
                </span>
                <span className="font-semibold text-gray-900">
                  ${(booking.total_price / 100).toFixed(2)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                <p className="text-xs text-gray-400">
                  Reservado el {formatDate(booking.created_at)}
                </p>
                {(booking.status === "AWAITING_SIGNATURES") && (
                  <button
                    type="button"
                    disabled={isCancelling === booking.id}
                    onClick={() => handleCancel(booking.id)}
                    className="bg-red-50 text-red-600 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors shrink-0"
                  >
                    {isCancelling === booking.id ? "Cancelando..." : "Cancelar reserva"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
