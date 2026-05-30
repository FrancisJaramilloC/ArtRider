"use client";

import { useState, useCallback } from "react";
import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";
import { MessageSquare } from "lucide-react";

// Mapa de estados → etiqueta visible + estilos
const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  AWAITING_SIGNATURES: { label: "Pendiente",          className: "bg-[#F9F5FB] text-[#875B9A]"    },
  PAID:               { label: "Aprobado / Pagado",   className: "bg-blue-50 text-blue-700"       },
  ACTIVE:             { label: "Activo",              className: "bg-emerald-50 text-emerald-700" },
  COMPLETED:          { label: "Completado",          className: "bg-violet-50 text-violet-700"   },
  DISPUTE:            { label: "En disputa",          className: "bg-red-50 text-red-700"         },
  CANCELLED:          { label: "Rechazado",           className: "bg-gray-100 text-gray-500"      },
  ARCHIVED:           { label: "Archivado",           className: "bg-gray-100 text-gray-400"      },
} as const;

// Formato de fecha compacto en español
const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"] as const;
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Anonimiza nombre del cliente: "Juan Pérez" → "Juan P."
function blindName(fullName: string): string {
  const parts = fullName.split(" ");
  return parts.length === 1 ? `${parts[0]} I.` : `${parts[0]} ${parts[1].charAt(0)}.`;
}

interface Props {
  bookings: BookingWithDetails[];
  onArchive: (bookingId: string, clientName: string) => void;
}

export default function ProviderBookingsSection({ bookings, onArchive }: Props) {
  const [filter, setFilter] = useState<"TODAY" | "WEEK">("TODAY");
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  // Aprobar reserva
  const handleApprove = useCallback(async (bookingId: string) => {
    setAnimatingId(bookingId);
    const { updateBookingStatus } = await import("@/services/bookingsService");
    const res = await updateBookingStatus(bookingId, "PAID");
    if (res.error) {
      alert("Error: " + res.error);
      setAnimatingId(null);
    } else {
      window.location.reload();
    }
  }, []);

  // Rechazar reserva
  const handleReject = useCallback(async (bookingId: string) => {
    const { updateBookingStatus } = await import("@/services/bookingsService");
    const res = await updateBookingStatus(bookingId, "CANCELLED");
    if (res.error) alert("Error: " + res.error);
    else window.location.reload();
  }, []);

  return (
    <section className="max-w-4xl mx-auto pb-24">
      {/* Filtro temporal */}
      <div className="flex items-center gap-6 mb-8">
        {(["TODAY", "WEEK"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xl font-bold transition-colors ${
              filter === f ? "text-[#111111]" : "text-[#8E8E93] hover:text-[#111111]"
            }`}
          >
            {f === "TODAY" ? "Hoy" : "Semana"}
          </button>
        ))}
      </div>

      {/* Lista de reservas */}
      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[16px] shadow-sm border border-gray-100 mt-6">
          <p className="text-[#8E8E93] font-medium">No hay solicitudes nuevas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const rawName = booking.client_profile?.full_name ?? "Cliente Desconocido";
            const isPending = booking.status === "AWAITING_SIGNATURES";
            const isApproved = booking.status === "PAID" || booking.status === "ACTIVE";
            const isAnimating = animatingId === booking.id;
            const displayName = isPending ? blindName(rawName) : rawName;
            const cover = booking.booking_units[0]?.listing?.image_urls?.[0] ?? null;

            const showArchive =
              booking.status === "COMPLETED" &&
              booking.payment_confirmed &&
              !booking.provider_has_reviewed;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden transition-all duration-300"
              >
                {/* Fila principal */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* Imagen del equipo + info */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-[#FAFAFC] overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                      {cover ? (
                        <img src={cover} alt="Equipo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">📦</span>
                      )}
                    </div>

                    <div>
                      {/* Nombre del cliente + badge */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#111111]">{displayName}</p>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${STATUS_CONFIG[booking.status].className}`}>
                          {STATUS_CONFIG[booking.status].label}
                        </span>
                      </div>

                      {/* Equipos reservados + ciudad */}
                      <div className="mt-1 flex flex-col gap-0.5">
                        {booking.booking_units.map((u) => (
                          <div key={u.id} className="flex flex-col">
                            <span className="text-xs text-[#111111] font-medium">
                              {u.quantity}x {u.listing?.title ?? "Equipo"}
                            </span>
                            {u.listing?.location && (
                              <span className="text-[10px] text-[#8E8E93] font-medium uppercase tracking-wider">
                                 {u.listing.location}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Fechas */}
                      <p className="text-[11px] text-[#8E8E93] mt-1">
                        {fmtDate(booking.start_date)} - {fmtDate(booking.end_date)}
                      </p>
                    </div>
                  </div>

                  {/* Precio + acciones */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <span className="font-bold text-lg text-[#111111]">
                      ${(booking.total_price / 100).toFixed(2)}
                    </span>

                    {isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(booking.id)}
                          className={`bg-[#111111] text-white font-bold px-4 py-2 text-xs rounded-lg transition-all ${
                            isAnimating ? "bg-[#25D366] text-transparent" : "hover:bg-black"
                          }`}
                        >
                          {isAnimating ? "✓" : "Aprobar"}
                        </button>
                        <button
                          onClick={() => handleReject(booking.id)}
                          className="bg-[#F3F4F6] text-[#8E8E93] font-bold px-4 py-2 text-xs rounded-lg hover:bg-gray-200 transition-all"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}

                    {showArchive && (
                      <button
                        onClick={() => onArchive(booking.id, rawName)}
                        className="border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors"
                      >
                        Archivar
                      </button>
                    )}
                  </div>
                </div>

                {/* Panel de identidad revelada (solo aprobados) */}
                <div
                  className={`bg-[#F0FDF4] transition-all duration-500 ease-in-out overflow-hidden ${
                    isApproved ? "max-h-[100px] opacity-100 border-t border-[#D1FAE5]" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-3 sm:px-5 flex items-center justify-between">
                    <p className="text-xs font-bold text-[#111111]">Identidad Revelada</p>
                    <button className="flex items-center gap-1.5 bg-white border border-[#D1FAE5] text-[#111111] text-xs font-bold px-3 py-1.5 rounded-md hover:bg-gray-50 transition opacity-80 cursor-not-allowed">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat próximamente
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
