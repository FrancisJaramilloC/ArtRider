"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";
import { cancelBooking } from "@/services/bookingsService";

// Mapa de estados → etiqueta visible + estilos
const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  AWAITING_SIGNATURES: { label: "Enviado al proveedor", className: "bg-[#FAFAFC] text-[#8E8E93]" },
  PAID:               { label: "Aprobado / Pagado",     className: "bg-blue-50 text-blue-700"     },
  ACTIVE:             { label: "Activo",                className: "bg-emerald-50 text-emerald-700" },
  COMPLETED:          { label: "Completado",            className: "bg-violet-50 text-violet-700" },
  DISPUTE:            { label: "En disputa",            className: "bg-red-50 text-red-700"       },
  CANCELLED:          { label: "Rechazado",             className: "bg-gray-100 text-gray-500"    },
  ARCHIVED:           { label: "Archivado",             className: "bg-gray-100 text-gray-400"    },
} as const;

<<<<<<< HEAD
// Formato de fecha compacto en español
const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"] as const;
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
=======
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
>>>>>>> origin/develop
}

// Extrae imagen de portada del primer equipo
function getCoverImage(booking: BookingWithDetails): string | null {
  return booking.booking_units[0]?.listing?.image_urls?.[0] ?? null;
}

interface Props {
  bookings: BookingWithDetails[];
}

<<<<<<< HEAD
export default function ClientBookingsSection({ bookings }: Props) {
  if (bookings.length === 0) return <EmptyState />;

  return (
    <section className="pb-24">
      <div className="space-y-4 mt-6">
        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </div>
=======
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
>>>>>>> origin/develop
    </section>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

/** Estado vacío con CTA al catálogo */
function EmptyState() {
  return (
    <section className="pb-24">
      <div className="text-center py-24 bg-white rounded-[24px] shadow-soft-premium border border-transparent mt-6">
        <p className="text-[#8E8E93] font-medium text-lg">No tienes alquileres activos</p>
        <p className="text-[#8E8E93] text-sm mt-2 opacity-80">Explora nuestros equipos y empieza a crear</p>
        <Link
          href="/"
          className="inline-block mt-8 px-8 py-3.5 bg-[#111111] text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-soft-premium"
        >
          Ver catálogo
        </Link>
      </div>
    </section>
  );
}

/** Tarjeta individual de reserva del cliente */
function BookingCard({ booking }: { booking: BookingWithDetails }) {
  const isPending = booking.status === "AWAITING_SIGNATURES";
  const cover = getCoverImage(booking);
  const { label, className: badgeCls } = STATUS_CONFIG[booking.status];

  return (
    <div className="bg-white rounded-[16px] p-5 sm:p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

        {/* Imagen + info del equipo */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#FAFAFC] overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
            {cover ? (
              <img src={cover} alt="Equipo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">📦</span>
            )}
          </div>

          <div>
            {/* Badge de estado */}
            <span className={`inline-block px-3 py-1 text-[10px] uppercase font-bold rounded-full tracking-wider mb-2 ${badgeCls}`}>
              {label}
            </span>

            {/* Nombre del equipo + ciudad */}
            {booking.booking_units.map((u) => (
              <div key={u.id}>
                <span className="block text-lg font-bold text-[#111111] leading-tight">
                  {u.quantity}x {u.listing?.title ?? "Equipo Alquilado"}
                </span>
                {u.listing?.location && (
                  <span className="text-xs text-[#8E8E93] font-medium uppercase tracking-wider block mt-0.5">
                    📍 {u.listing.location}
                  </span>
                )}
              </div>
            ))}

            {/* Rango de fechas */}
            <p className="text-sm text-[#8E8E93] mt-2">
              {fmtDate(booking.start_date)} - {fmtDate(booking.end_date)}
            </p>
          </div>
        </div>

        {/* Precio + meta */}
        <div className="flex flex-col sm:items-end w-full sm:w-auto">
          <span className="font-bold text-2xl text-[#111111]">
            ${(booking.total_price / 100).toFixed(2)}
          </span>
          <p className="text-xs text-[#8E8E93] mt-2 sm:text-right">
            Solicitado el {fmtDate(booking.created_at)}
          </p>
          {isPending && (
            <p className="text-xs font-semibold text-[#875B9A] mt-3 sm:text-right bg-[#F9F5FB] px-3 py-1.5 rounded-lg inline-block w-fit sm:w-auto">
              Esperando confirmación del proveedor
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
