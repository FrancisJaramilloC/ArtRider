import Link from "next/link";
import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  AWAITING_SIGNATURES: { label: "Enviado al proveedor", className: "bg-[#FAFAFC] text-[#8E8E93]" },
  PAID:               { label: "Aprobado / Pagado",     className: "bg-blue-50 text-blue-700"     },
  ACTIVE:             { label: "Activo",                className: "bg-emerald-50 text-emerald-700" },
  COMPLETED:          { label: "Completado",            className: "bg-violet-50 text-violet-700" },
  DISPUTE:            { label: "En disputa",            className: "bg-red-50 text-red-700"       },
  CANCELLED:          { label: "Rechazado",             className: "bg-gray-100 text-gray-500"    },
  ARCHIVED:           { label: "Archivado",             className: "bg-gray-100 text-gray-400"    },
} as const;

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"] as const;
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function getCoverImage(booking: BookingWithDetails): string | null {
  return booking.booking_units[0]?.listing?.image_urls?.[0] ?? null;
}

interface Props {
  bookings: BookingWithDetails[];
  onReview: (bookingId: string, listingTitle: string) => void;
}

export default function ClientBookingsSection({ bookings, onReview }: Props) {
  if (bookings.length === 0) return <EmptyState />;

  return (
    <section className="pb-24">
      <div className="space-y-4 mt-6">
        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} onReview={onReview} />
        ))}
      </div>
    </section>
  );
}

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

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={star <= rating ? "#F59E0B" : "#E5E7EB"}
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function BookingCard({
  booking,
  onReview,
}: {
  booking: BookingWithDetails;
  onReview: (bookingId: string, listingTitle: string) => void;
}) {
  const isPending = booking.status === "AWAITING_SIGNATURES";
  const firstUnit = booking.booking_units[0];
  const canReview = booking.status === "COMPLETED" && !booking.client_has_reviewed;
  const hasReviewed = booking.status === "COMPLETED" && booking.client_has_reviewed;
  const cover = getCoverImage(booking);
  const { label, className: badgeCls } = STATUS_CONFIG[booking.status];

  const handleReview = () => {
    const listingTitle = firstUnit?.listing?.title ?? "Equipo alquilado";
    onReview(booking.id, listingTitle);
  };

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
            <span className={`inline-block px-3 py-1 text-[10px] uppercase font-bold rounded-full tracking-wider mb-2 ${badgeCls}`}>
              {label}
            </span>

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

            <p className="text-sm text-[#8E8E93] mt-2">
              {fmtDate(booking.start_date)} - {fmtDate(booking.end_date)}
            </p>
          </div>
        </div>

        {/* Precio + acciones */}
        <div className="flex flex-col sm:items-end w-full sm:w-auto gap-2">
          <span className="font-bold text-2xl text-[#111111]">
            ${(booking.total_price / 100).toFixed(2)}
          </span>
          <p className="text-xs text-[#8E8E93] sm:text-right">
            Solicitado el {fmtDate(booking.created_at)}
          </p>

          {isPending && (
            <p className="text-xs font-semibold text-[#875B9A] mt-1 sm:text-right bg-[#F9F5FB] px-3 py-1.5 rounded-lg inline-block w-fit sm:w-auto">
              Esperando confirmación del proveedor
            </p>
          )}

          {canReview && (
            <button
              type="button"
              onClick={handleReview}
              className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-[#875B9A] text-white text-xs font-semibold rounded-full hover:bg-[#6a437a] transition-colors shadow-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Dejar reseña
            </button>
          )}

          {hasReviewed && (
            <div className="mt-1 flex items-center gap-1.5">
              <StarDisplay rating={booking.client_review_rating ?? 5} />
              <span className="text-xs text-[#8E8E93]">Reseña enviada</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
