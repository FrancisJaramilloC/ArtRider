"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, X, Loader2, CheckCircle2 } from "lucide-react";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function VerificationModal({ isOpen, onClose, onVerified }: VerificationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // Estado local para mostrar un check luego de que el usuario regrese exitoso
  const [success, setSuccess] = useState(false); 
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleVerify = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Por ahora no usaremos Stripe para identidad, simulamos el proceso exitoso
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setSuccess(true);
      setTimeout(() => {
        onVerified();
      }, 2000);
    } catch (e: any) {
      setError(e.message || "Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          {success ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Identidad Enviada!</h2>
              <p className="text-gray-600 leading-relaxed">
                Estamos procesando tus documentos. Recibirás una notificación cuando termines. Ahora puedes continuar con tu reserva.
              </p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Verifica tu identidad
              </h2>
              
              <p className="text-gray-600 leading-relaxed mb-8">
                Para alquilar este equipo de alto valor, necesitamos confirmar tu identidad. 
                Deberás escanear una identificación oficial y tomarte una foto (selfie).
              </p>

              {error && (
                <div className="mb-6 p-4 text-sm text-red-800 bg-red-50 rounded-xl text-left">
                  {error}
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#875B9A] hover:bg-[#6a437a] text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Iniciando verificación...</span>
                  </>
                ) : (
                  <span>Verificar identidad</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
