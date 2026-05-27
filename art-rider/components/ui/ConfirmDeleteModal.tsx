"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  /** Nombre del item a eliminar — se muestra en el encabezado */
  itemName: string;
  /** Tipo de recurso para el texto contextual */
  itemType?: "equipo" | "paquete" | string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmación irreversible con checkbox doble de confirmación.
 * El botón "Sí, eliminar" permanece deshabilitado hasta que el usuario
 * marque "Entiendo las consecuencias".
 */
export default function ConfirmDeleteModal({
  isOpen,
  itemName,
  itemType = "elemento",
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const [understood, setUnderstood] = useState(false);

  // Resetear checkbox cada vez que el modal se abre
  useEffect(() => {
    if (isOpen) setUnderstood(false);
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado rojo */}
        <div className="bg-red-50 px-6 pt-7 pb-6 border-b border-red-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <h2
                id="delete-modal-title"
                className="text-lg font-bold text-gray-900 leading-tight"
              >
                Eliminar {itemType}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate" title={itemName}>
                &ldquo;{itemName}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-6 pt-5 pb-6 space-y-5">

          {/* Advertencia explícita */}
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-4">
            <p className="text-sm font-semibold text-red-700 leading-relaxed">
              ⚠️ Esta acción es completamente irreversible. Perderás la publicación
              y todos sus datos asociados permanentemente.
            </p>
          </div>

          {/* Checkbox de doble confirmación */}
          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                id="understood-checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                  ${understood
                    ? "bg-red-500 border-red-500"
                    : "bg-white border-gray-300 group-hover:border-red-300"
                  }`}
              >
                {understood && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors leading-relaxed">
              Entiendo que esta acción no se puede deshacer
            </span>
          </label>

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!understood}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
