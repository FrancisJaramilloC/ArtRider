"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCartQuote } from "@/hooks/useCartQuote";
import KushkiPaymentForm from "@/components/features/bookings/KushkiPaymentForm";

const money = (value: number) => `$${(value / 100).toFixed(2)}`;

export default function CartCheckoutClient() {
  const cart = useCart();
  const { quote, error, loading } = useCartQuote();
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const handlePayment = async (token: string) => {
    if (!quote || !cart.startDate || !cart.endDate) return;
    setProcessing(true);
    try {
      const response = await fetch("/api/cart/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          items: cart.items.map((item) => ({ listingId: item.listingId, quantity: item.quantity })),
          startDate: cart.startDate,
          endDate: cart.endDate,
          proposalId: cart.proposalId,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "No se pudo completar el pago.");

      cart.clearCart();
      router.replace(`/checkout/cart/success?order=${encodeURIComponent(result.orderId)}`);
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "No se pudo completar el pago.");
      setProcessing(false);
    }
  };

  if (!cart.hydrated || loading) {
    return <div className="max-w-5xl mx-auto px-4 py-20 text-gray-500">Validando orden…</div>;
  }
  if (!cart.items.length) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">No hay equipos para pagar</h1>
        <Link href="/cart" className="text-[#875B9A] font-semibold underline">Volver al carrito</Link>
      </div>
    );
  }
  if (error || !quote) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Revisa tu carrito</h1>
        <p className="text-red-600 mb-6">{error || "No se pudo validar la orden."}</p>
        <Link href="/cart" className="text-[#875B9A] font-semibold underline">Volver al carrito</Link>
      </div>
    );
  }

  const providerGroups = new Map<string, typeof quote.items>();
  for (const item of quote.items) {
    providerGroups.set(item.providerId, [...(providerGroups.get(item.providerId) ?? []), item]);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 mb-8">
        <ArrowLeft className="w-4 h-4" /> Volver al carrito
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Confirma y paga una sola vez</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
        <section>
          {processing ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center font-semibold">Procesando el pago y creando {quote.providerCount} reserva(s)…</div>
          ) : (
            <KushkiPaymentForm
              amount={quote.total}
              onSuccess={handlePayment}
              onError={(message) => alert(message)}
            />
          )}
          <div className="mt-4 flex gap-2 text-sm text-gray-500">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            El importe se calcula nuevamente en el servidor. Si no se pueden crear todas las reservas, ArtRider intenta anular automáticamente el cobro.
          </div>
        </section>

        <aside className="bg-white border border-gray-200 rounded-2xl p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-bold mb-2">Resumen de la orden</h2>
          <p className="text-sm text-gray-500 mb-5">{quote.startDate} — {quote.endDate} · {quote.days} día(s)</p>
          <div className="space-y-5">
            {[...providerGroups.entries()].map(([providerId, items]) => (
              <div key={providerId} className="border-b border-gray-100 pb-4 last:border-0">
                <h3 className="text-sm font-bold text-gray-900 mb-2">{items[0].providerName}</h3>
                {items.map((item) => (
                  <div key={item.listingId} className="flex justify-between gap-3 text-sm py-1">
                    <span className="text-gray-600">{item.quantity}× {item.title}</span>
                    <span>{money(item.lineSubtotal)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{money(quote.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Servicio ArtRider</span><span>{money(quote.serviceFee)}</span></div>
          </div>
          <div className="flex justify-between items-center border-t border-gray-200 mt-4 pt-4">
            <span className="font-bold">Total USD</span>
            <span className="text-2xl font-bold">{money(quote.total)}</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
