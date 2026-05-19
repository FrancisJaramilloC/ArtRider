"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingWithDetails } from "@/services/bookingsService";
import { archiveBookingWithReview } from "@/services/bookingsService";
import ClientBookingsSection from "./ClientBookingsSection";
import ProviderBookingsSection from "./ProviderBookingsSection";
import ReviewModal from "./ReviewModal";

// Props de la vista de reservas
interface BookingsViewProps {
  clientBookings: BookingWithDetails[];
  providerBookings: BookingWithDetails[] | null;
  isProvider: boolean;
}

// Componente principal de la vista de reservas
export default function BookingsView({ clientBookings, providerBookings, isProvider }: BookingsViewProps) {
  // Estados del componente
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"client" | "provider">("client");
  const [reviewModal, setReviewModal] = useState<{ bookingId: string; clientName: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manejo del archivo de reserva
  const handleArchive = (bookingId: string, clientName: string) => {
    setReviewModal({ bookingId, clientName });
  };

  // Manejo del envío de reseña
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

  // Renderizado de la vista de reservas
  return (
    <div className="space-y-8">
      {/* Encabezado de la página */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Gestiona tus alquileres de equipos de audio e iluminacion
        </p>
      </div>

      {/* Tabs — solo se muestran si el usuario también es proveedor */}
      {isProvider && (
        <div className="flex border-b border-gray-200 gap-8">
          {(["client", "provider"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-[#875B9A] text-[#875B9A]"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab === "client" ? "Mis Alquileres" : "Solicitudes Recibidas"}
            </button>
          ))}
        </div>
      )}

      {/* Contenido de la vista de reservas */}
      {activeTab === "client" && (
        <ClientBookingsSection bookings={clientBookings} />
      )}
      {isProvider && activeTab === "provider" && (
        <ProviderBookingsSection
          bookings={providerBookings ?? []}
          onArchive={handleArchive}
        />
      )}

      {/*  Modal de reseña  */}
      {reviewModal && (
        <ReviewModal
          bookingId={reviewModal.bookingId}
          clientName={reviewModal.clientName}
          onSubmit={handleReviewSubmit}
          onClose={() => setReviewModal(null)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
