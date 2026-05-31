"use client";

import { useEffect, useState } from "react";
import { CreditCard, Lock, User, Calendar } from "lucide-react";

interface KushkiPaymentFormProps {
  amount: number; // in cents
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
}

export default function KushkiPaymentForm({ amount, onSuccess, onError }: KushkiPaymentFormProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    if (document.getElementById("kushki-js")) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "kushki-js";
    // We use Kushki.js instead of KushkiCheckout (Cajita) for a custom UI
    script.src = "https://cdn.kushkipagos.com/kushki.min.js";
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => onError("Error loading Kushki SDK");
    document.body.appendChild(script);
  }, [onError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isScriptLoaded) return;
    
    setIsProcessing(true);

    const win = window as any;
    if (!win.Kushki) {
      onError("Kushki SDK no está disponible");
      setIsProcessing(false);
      return;
    }

    const merchantId = process.env.NEXT_PUBLIC_KUSHKI_MERCHANT_ID;
    if (!merchantId) {
      onError("Falta la llave pública de Kushki");
      setIsProcessing(false);
      return;
    }

    const kushkiInstance = new win.Kushki({
      merchantId: merchantId,
      inTestEnvironment: true,
    });

    // Parse expiry MM/YY
    const [month, year] = expiry.split("/").map(s => s.trim());
    const cleanCardNumber = cardNumber.replace(/\D/g, "");

    // Genera token seguro con Kushki pasándole la tarjeta (incluye CVC para evitar K015)
    kushkiInstance.requestToken({
      amount: (amount / 100).toFixed(2),
      currency: "USD",
      card: {
        name: name,
        number: cleanCardNumber,
        cvc: cvv,
        expiryMonth: month || "",
        expiryYear: year || "",
      }
    }, (response: any) => {
      if (!response.code) {
        // Exito
        onSuccess(response.token);
      } else {
        // Error
        setIsProcessing(false);
        onError(response.message || "Error al validar la tarjeta");
      }
    });
  };

  // Format card number with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    let formatted = val.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted.substring(0, 19));
  };

  // Format expiry as MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length >= 2) {
      val = val.substring(0, 2) + "/" + val.substring(2, 4);
    }
    setExpiry(val.substring(0, 5));
  };

  return (
    <div className="w-full bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Lock className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-bold text-[#111111]">Pago Seguro</h3>
      </div>

      {!isScriptLoaded ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded-xl w-full"></div>
          <div className="h-10 bg-gray-100 rounded-xl w-full"></div>
          <div className="h-10 bg-gray-100 rounded-xl w-full"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre en la tarjeta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan Perez"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-[#875B9A] focus:ring-1 focus:ring-[#875B9A] outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Número de Tarjeta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="Ej: 4242 4242 4242 4242"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-[#875B9A] focus:ring-1 focus:ring-[#875B9A] outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vencimiento</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={expiry}
                  onChange={handleExpiryChange}
                  placeholder="Ej: 12/28"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-[#875B9A] focus:ring-1 focus:ring-[#875B9A] outline-none transition-colors"
                />
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">CVV</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 123"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-[#875B9A] focus:ring-1 focus:ring-[#875B9A] outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full mt-6 bg-[#111111] hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-soft-premium hover:scale-[1.02] disabled:scale-100 disabled:shadow-none"
          >
            {isProcessing ? "Procesando pago..." : `Pagar $${(amount / 100).toFixed(2)}`}
          </button>
        </form>
      )}
    </div>
  );
}
