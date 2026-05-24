"use client";

import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";

// Configuración de estados de reserva
const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  AWAITING_SIGNATURES: { label: "Esperando firmas", className: "bg-amber-50 text-amber-700" },
  PAID:               { label: "Pagado",            className: "bg-blue-50 text-blue-700"  },
  ACTIVE:             { label: "Activo",             className: "bg-emerald-50 text-emerald-700" },
  COMPLETED:          { label: "Completado",         className: "bg-violet-50 text-violet-700"  },
  DISPUTE:            { label: "En disputa",         className: "bg-red-50 text-red-700"   },
  CANCELLED:          { label: "Cancelado",          className: "bg-gray-100 text-gray-500" },
  ARCHIVED:           { label: "Archivado",          className: "bg-gray-100 text-gray-400" },
};

// Mapeo de meses abreviados
const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

// Formateo de fechas
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Props de la sección de reservas del proveedor
interface ProviderBookingsSectionProps {
  bookings: BookingWithDetails[];
  onArchive: (bookingId: string, clientName: string) => void;
}

export default function ProviderBookingsSection({
  bookings,
  onArchive,
}: ProviderBookingsSectionProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900">Solicitudes Recibidas</h2>
      <p className="text-sm text-gray-500 mt-1">
        Gestiona las reservas de tus equipos de audio e iluminacion
      </p>

      {bookings.length === 0 ? ( // Si no hay reservas  
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 mt-6">
          <p className="text-gray-500 font-medium">No tienes solicitudes activas</p>
          <p className="text-gray-400 text-sm mt-1">
            Cuando alguien reserve tus equipos apareceran aqui
          </p>
        </div>
      ) : ( // Si hay reservas
        <div className="space-y-4 mt-6">
          {bookings.map((booking) => {
            const clientName = booking.client_profile?.full_name ?? "Cliente";
            const initial = clientName.charAt(0).toUpperCase();
            const showArchive =
              booking.status === "COMPLETED" &&
              booking.payment_confirmed &&
              !booking.provider_has_reviewed;

            // Renderizado de la información de la reserva
            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm shrink-0">
                      {initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{clientName}</p>
                      <p className="text-xs text-gray-400">Cliente</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[booking.status].className}`}
                  >
                    {STATUS_CONFIG[booking.status].label}
                  </span>
                </div>
                {/* Renderizado de los equipos reservados */}
                <div className="mt-3">
                  {booking.booking_units.map((u) => (
                    <span key={u.id} className="block text-sm font-medium text-gray-800">
                      {u.quantity}x {u.listing?.title ?? "Equipo"}
                    </span>
                  ))}
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

                {/* Renderizado de la fecha de la reserva y acciones */}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Reservado el {formatDate(booking.created_at)}
                  </p>
                  <div className="flex gap-2">
                    {booking.status === "AWAITING_SIGNATURES" && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            const { updateBookingStatus } = await import("@/services/bookingsService");
                            const res = await updateBookingStatus(booking.id, "PAID");
                            if (res.error) alert("Error: " + res.error);
                            else window.location.reload();
                          }}
                          className="bg-green-600 text-white hover:bg-green-700 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const { updateBookingStatus } = await import("@/services/bookingsService");
                            const res = await updateBookingStatus(booking.id, "CANCELLED");
                            if (res.error) alert("Error: " + res.error);
                            else window.location.reload();
                          }}
                          className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {showArchive && (
                      <button
                        type="button"
                        onClick={() => onArchive(booking.id, clientName)}
                        className="border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                      >
                        Archivar alquiler
                      </button>
                    )}
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
