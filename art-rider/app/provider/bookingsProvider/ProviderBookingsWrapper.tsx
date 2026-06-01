"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingWithDetails } from "@/services/bookingsService";
import { archiveBookingWithReview } from "@/services/bookingsService";
import ProviderBookingsSection from "@/components/features/bookings/ProviderBookingsSection";
import ReviewModal from "@/components/features/bookings/ReviewModal";

export default function ProviderBookingsWrapper({ bookings }: { bookings: BookingWithDetails[] }) {
  const router = useRouter();
  const [reviewModal, setReviewModal] = useState<{ bookingId: string; clientName: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleArchive = (bookingId: string, clientName: string) => {
    setReviewModal({ bookingId, clientName });
  };

  const handleReviewSubmit = async (review: { rating: number; content: string }) => {
    if (!reviewModal) return;
    setIsSubmitting(true);
    try {
      const result = await archiveBookingWithReview(reviewModal.bookingId, review);
      if (result.success) {
        setReviewModal(null);
        router.refresh();
      } else {
        alert(result.error ?? "No se pudo completar la operacion");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <ProviderBookingsSection bookings={bookings} onArchive={handleArchive} />
      
      {reviewModal && (
        <ReviewModal
          bookingId={reviewModal.bookingId}
          subjectName={reviewModal.clientName}
          title="Reseña del cliente"
          description={`Califica tu experiencia con ${reviewModal.clientName} antes de archivar`}
          submitLabel="Enviar y archivar"
          placeholder="Cuéntanos sobre la experiencia con este cliente..."
          onSubmit={handleReviewSubmit}
          onClose={() => setReviewModal(null)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
