"use client";

import { useState } from "react";

interface ReviewModalProps {
  bookingId: string;
  subjectName: string;
  onSubmit: (review: { rating: number; content: string }) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
  placeholder?: string;
}

export default function ReviewModal({
  bookingId: _bookingId,
  subjectName,
  onSubmit,
  onClose,
  isSubmitting,
  title = "Deja tu reseña",
  description,
  submitLabel = "Enviar reseña",
  placeholder = "Cuéntanos sobre tu experiencia...",
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [content, setContent] = useState("");

  const isDisabled = isSubmitting || rating === 0 || content.trim() === "";

  const handleSubmit = async () => {
    if (isDisabled) return;
    await onSubmit({ rating, content });
  };

  const activeRating = hovered || rating;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-xl text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          {description ?? `Califica tu experiencia con ${subjectName}`}
        </p>

        {/* Estrellas interactivas */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Calificación</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="text-3xl leading-none transition-all duration-100 hover:scale-110"
                style={{ color: star <= activeRating ? "#F59E0B" : "#E5E7EB" }}
                aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
              >
                ★
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs text-gray-400 mt-1.5">
              {["", "Pésimo", "Malo", "Regular", "Bueno", "Excelente"][rating]}
            </p>
          )}
        </div>

        {/* Comentario */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comentario
          </label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-[#875B9A]/30 transition-shadow"
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* Acciones */}
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
            {isSubmitting ? "Enviando..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
