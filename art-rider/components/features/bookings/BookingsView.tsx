"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingWithDetails } from "@/services/bookingsService";
import { createClientReview, type SentReviewWithMeta } from "@/services/reviewService";
import ClientBookingsSection from "./ClientBookingsSection";
import ReviewModal from "./ReviewModal";

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"] as const;
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width="12" height="12" viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? "#F59E0B" : "#E5E7EB"} aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

interface BookingsViewProps {
  clientBookings: BookingWithDetails[];
  sentReviews: SentReviewWithMeta[];
}

export default function BookingsView({ clientBookings, sentReviews }: BookingsViewProps) {
  const router = useRouter();
  const [reviewModal, setReviewModal] = useState<{
    bookingId: string;
    listingTitle: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenReview = (bookingId: string, listingTitle: string) => {
    setReviewModal({ bookingId, listingTitle });
  };

  const handleReviewSubmit = async (review: {
    rating: number;
    content: string;
  }) => {
    if (!reviewModal) return;
    setIsSubmitting(true);
    try {
      const result = await createClientReview(reviewModal.bookingId, review);
      if (result.success) {
        setReviewModal(null);
        router.refresh();
      } else {
        alert(result.error ?? "No se pudo enviar la reseña");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold text-[#111111]">Mis Reservas</h1>
        <p className="text-[#8E8E93] mt-1 text-sm">
          Consulta y gestiona los equipos que has alquilado
        </p>
      </div>

      <ClientBookingsSection
        bookings={clientBookings}
        onReview={handleOpenReview}
      />

      {/* Reseñas enviadas */}
      {sentReviews.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-[#111111] mb-4">Mis reseñas</h2>
          <div className="space-y-3">
            {sentReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-[16px] p-5 shadow-sm border border-gray-100 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-bold text-[#111111]">
                      {review.listing_title}
                    </p>
                    {review.provider_name && (
                      <p className="text-xs text-[#8E8E93]">{review.provider_name}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#8E8E93] shrink-0">{fmtDate(review.created_at)}</span>
                </div>
                <StarRow rating={review.rating} />
                <p className="text-sm text-[#111111] leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {reviewModal && (
        <ReviewModal
          bookingId={reviewModal.bookingId}
          subjectName={reviewModal.listingTitle}
          title="¿Cómo fue tu experiencia?"
          description="Tu reseña ayuda a otros usuarios a elegir mejor"
          submitLabel="Publicar reseña"
          placeholder="¿Qué te pareció el equipo? ¿Cómo fue la experiencia general?"
          onSubmit={handleReviewSubmit}
          onClose={() => setReviewModal(null)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
