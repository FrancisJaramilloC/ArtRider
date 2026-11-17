"use client";

import { useEffect, useState } from "react";
import { resendConfirmation } from "@/services/authService";

const RESEND_COOLDOWN_SECONDS = 60;

/** Botón «Reenviar correo» con cooldown de 60 s. `startCooling` arranca la cuenta atrás al montar (correo recién enviado). */
export default function ResendConfirmation({ email, startCooling = false }: { email: string; startCooling?: boolean }) {
  const [remaining, setRemaining] = useState(startCooling ? RESEND_COOLDOWN_SECONDS : 0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  async function handleResend() {
    if (sending || remaining > 0) return;
    setSending(true);
    setMessage(null);
    const result = await resendConfirmation(email);
    setSending(false);
    if (result.error) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setMessage({ kind: "ok", text: "Te enviamos un nuevo enlace. Revisa tu correo." });
    setRemaining(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleResend}
        disabled={sending || remaining > 0}
        className="w-full rounded-2xl border border-[#875B9A] text-[#875B9A] hover:bg-[#875B9A]/5 py-3 text-[0.95rem] font-bold transition-all disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {sending ? "Enviando..." : remaining > 0 ? `Reenviar correo (${remaining} s)` : "Reenviar correo"}
      </button>
      {message && (
        <p role="status" className={`text-sm font-medium text-center ${message.kind === "ok" ? "text-[#875B9A]" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
