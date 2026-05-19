"use client";

import { useState } from "react";

// Props del modal de reseña
interface ReviewModalProps {
  bookingId: string;
  clientName: string;
  onSubmit: (review: { rating: number; content: string }) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

// Modal de reseña
export default function ReviewModal({
  bookingId,
  clientName,
  onSubmit,
  onClose,
  isSubmitting,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");

  // Deshabilitar el boton de enviar si la reseña no esta completa
  const isDisabled = isSubmitting || rating === 0 || content.trim() === "";

  // Funcion para manejar el envio de la reseña
  const handleSubmit = async () => {
    if (isDisabled) return;
    await onSubmit({ rating, content });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-xl text-gray-900">Reseña del cliente</h2>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Califica tu experiencia con {clientName} antes de archivar
        </p>

        {/* Renderizado de estrellas para calificar */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Calificación</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-3xl leading-none transition-colors"
                style={{ color: star <= rating ? "#F59E0B" : "#E5E7EB" }}
                aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Campo de texto para la reseña */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comentario
          </label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-[#875B9A]/30"
            placeholder="Cuentanos sobre la experiencia con este cliente..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* Botones de cancelar y enviar */}
          <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 rounded-full py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDisabled}
            className="flex-1 bg-[#6a437a] text-white rounded-full py-2.5 text-sm font-semibold hover:bg-[#5c3569] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar y archivar
          </button>
        </div>
      </div>
    </div>
  );
}
