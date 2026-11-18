import { useState } from 'react';

import { usePricing } from '@/contexts/PricingContext';
import type { ChargeQuote } from '@/services/chargeService';

/**
 * Manejo del 409 PRICE_CHANGED del cobro: guarda el desglose nuevo del servidor (para mostrarlo en el resumen y en el botón de pago),
 * vuelve a leer las tasas y devuelve el mensaje para el Rider. No se cobró nada: debe revisar el nuevo total y volver a pagar.
 */
export function usePriceChange() {
  const { refreshRates } = usePricing();
  const [quote, setQuote] = useState<ChargeQuote | null>(null);

  /** Mensaje a mostrar si el resultado es un cambio de precio; `null` si es otro resultado. */
  function handle(result: { code?: string; error?: string; quote?: ChargeQuote }): string | null {
    if (result.code !== 'PRICE_CHANGED') return null;
    if (result.quote) setQuote(result.quote);
    refreshRates();
    const total = result.quote ? ` Nuevo total: $${(result.quote.total / 100).toFixed(2)}.` : '';
    return `${result.error ?? 'Los precios cambiaron.'}${total} No se te cobró nada: revisa el resumen y pulsa «Pagar» para confirmar.`;
  }

  return { quote, handle };
}
