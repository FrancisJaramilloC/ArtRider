import Link from "next/link";
import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";

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
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Props de la sección de reservas del cliente
interface ClientBookingsSectionProps {
  bookings: BookingWithDetails[];
}

// Componente de la sección de reservas del cliente
export default function ClientBookingsSection({ bookings }: ClientBookingsSectionProps) {
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

              <p className="text-xs text-gray-400 mt-2">
                Reservado el {formatDate(booking.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
