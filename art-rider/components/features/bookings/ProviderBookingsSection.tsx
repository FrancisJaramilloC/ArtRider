"use client";

import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  AWAITING_SIGNATURES: { label: "Esperando firmas", className: "bg-amber-50 text-amber-700" },
  PAID:               { label: "Pagado",            className: "bg-blue-50 text-blue-700"  },
  ACTIVE:             { label: "Activo",             className: "bg-emerald-50 text-emerald-700" },
  COMPLETED:          { label: "Completado",         className: "bg-violet-50 text-violet-700"  },
  DISPUTE:            { label: "En disputa",         className: "bg-red-50 text-red-700"   },
  CANCELLED:          { label: "Cancelado",          className: "bg-gray-100 text-gray-500" },
  ARCHIVED:           { label: "Archivado",          className: "bg-gray-100 text-gray-400" },
};

const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

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

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 mt-6">
          <p className="text-gray-500 font-medium">No tienes solicitudes activas</p>
          <p className="text-gray-400 text-sm mt-1">
            Cuando alguien reserve tus equipos apareceran aqui
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {bookings.map((booking) => {
            const clientName = booking.client_profile?.full_name ?? "Cliente";
            const initial = clientName.charAt(0).toUpperCase();
            const showArchive =
              booking.status === "COMPLETED" &&
              booking.payment_confirmed &&
              !booking.provider_has_reviewed;

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

                <div className="mt-3">
                  {booking.booking_units.map((u) => (
                    <span key={u.id} className="block text-sm font-medium text-gray-800">
                      {u.quantity}x {u.listing?.title ?? "Equipo"}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex justify-between items-end">
                  <span className="text-sm text-gray-500">
                    {formatDate(booking.start_date)} &rarr; {formatDate(booking.end_date)}
                  </span>
                  <span className="font-semibold text-gray-900">
                    ${(booking.total_price / 100).toFixed(2)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Reservado el {formatDate(booking.created_at)}
                  </p>
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
            );
          })}
        </div>
      )}
    </section>
  );
}
