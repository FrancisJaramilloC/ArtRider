"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarDays, LockKeyhole, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCartQuote } from "@/hooks/useCartQuote";

const money = (value: number) => `$${(value / 100).toFixed(2)}`;

export default function CartPageClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const cart = useCart();
  const { quote, error, loading } = useCartQuote();

  if (!cart.hydrated) {
    return <div className="max-w-6xl mx-auto px-4 py-16 text-gray-500">Cargando carrito…</div>;
  }

  if (!cart.items.length) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-14 h-14 mx-auto text-gray-300 mb-5" />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Tu carrito está vacío</h1>
        <p className="text-gray-500 mb-8">Agrega equipos desde el catálogo o solicita una recomendación de ArtRider Advisory.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/explore" className="px-5 py-3 rounded-xl bg-black text-white font-semibold">Explorar equipos</Link>
          <Link href="/cotizar" className="px-5 py-3 rounded-xl border border-gray-300 font-semibold">Usar Advisory</Link>
        </div>
      </main>
    );
  }

  const displayItems = quote?.items ?? cart.items.map((item) => ({
    listingId: item.listingId,
    providerId: item.providerId || "",
    providerUserId: "",
    providerName: item.providerName || "Validando proveedor…",
    title: item.title,
    unitPrice: item.dailyPrice,
    quantity: item.quantity,
    coverImageUrl: item.coverImageUrl || null,
    lineSubtotal: item.dailyPrice * item.quantity,
  }));
  const providers = new Map<string, typeof displayItems>();
  for (const item of displayItems) {
    const key = item.providerId || item.providerName;
    providers.set(key, [...(providers.get(key) ?? []), item]);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-[#875B9A] mb-1">Compra multi‑proveedor</p>
          <h1 className="text-3xl font-bold text-gray-900">Tu carrito</h1>
        </div>
        {cart.locked && (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-purple-50 text-purple-800 text-sm font-semibold">
            <LockKeyhole className="w-4 h-4" /> Rider firmado
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-sm">
            <CalendarDays className="w-5 h-5 text-[#875B9A]" />
            <span><strong>Fechas comunes:</strong> {cart.startDate} — {cart.endDate}</span>
          </div>

          {[...providers.entries()].map(([providerId, items]) => (
            <section key={providerId} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <header className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-bold text-gray-900">{items[0]?.providerName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Se creará una reserva para este proveedor</p>
              </header>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.listingId} className="p-5 flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {item.coverImageUrl
                        ? <Image src={item.coverImageUrl} alt="" width={80} height={80} className="w-full h-full object-cover" />
                        : <div className="w-full h-full grid place-items-center text-xs text-gray-400">Sin foto</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{money(item.unitPrice)} por día</p>
                      <div className="flex items-center justify-between gap-3 mt-3">
                        {cart.locked ? (
                          <span className="text-sm font-semibold">Cantidad: {item.quantity}</span>
                        ) : (
                          <div className="inline-flex items-center border border-gray-200 rounded-lg">
                            <button
                              type="button"
                              aria-label="Reducir cantidad"
                              onClick={() => cart.setQuantity(item.listingId, item.quantity - 1)}
                              className="p-2 hover:bg-gray-50 disabled:opacity-40"
                              disabled={item.quantity <= 1}
                            ><Minus className="w-4 h-4" /></button>
                            <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              aria-label="Aumentar cantidad"
                              onClick={() => cart.setQuantity(item.listingId, item.quantity + 1)}
                              className="p-2 hover:bg-gray-50"
                            ><Plus className="w-4 h-4" /></button>
                          </div>
                        )}
                        {!cart.locked && (
                          <button
                            type="button"
                            onClick={() => cart.removeItem(item.listingId)}
                            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
                          ><Trash2 className="w-4 h-4" /> Quitar</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="bg-white border border-gray-200 rounded-2xl p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-bold mb-5">Resumen</h2>
          {loading && <p className="text-sm text-gray-500 mb-4">Validando precios y disponibilidad…</p>}
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl mb-4">{error}</p>}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Equipos</span><span>{quote ? money(quote.subtotal) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Servicio ArtRider</span><span>{quote ? money(quote.serviceFee) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Proveedores</span><span>{quote?.providerCount ?? providers.size}</span></div>
          </div>
          <div className="flex justify-between items-center border-t border-gray-200 mt-5 pt-5 mb-6">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-bold">{quote ? money(quote.total) : "—"}</span>
          </div>
          <Link
            href={isAuthenticated ? "/checkout/cart" : "/login?redirect=/checkout/cart"}
            aria-disabled={!quote || Boolean(error)}
            className={`block w-full text-center py-4 rounded-xl font-bold transition ${
              quote && !error ? "bg-black text-white hover:bg-gray-800" : "bg-gray-200 text-gray-400 pointer-events-none"
            }`}
          >
            {isAuthenticated ? "Continuar al pago" : "Inicia sesión para pagar"}
          </Link>
          {!cart.locked && (
            <button
              type="button"
              onClick={cart.clearCart}
              className="w-full mt-3 inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-500 border border-red-200 bg-red-50/50 rounded-xl hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Vaciar carrito
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}
