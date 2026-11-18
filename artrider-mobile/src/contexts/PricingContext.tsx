import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchPricingRates } from '@/services/pricingConfigService';
import { computeCartTotals, DEFAULT_PRICING_RATES, riderDailyPrice, type CartTotals, type PricingRates } from '@/utils/pricing';

type PricingContextValue = {
  rates: PricingRates;
  /** Precio por día que ve el Rider a partir del precio del Partner (centavos). */
  riderPrice: (partnerDailyCents: number) => number;
  /** Subtotal (ya en precios del Rider) → subtotal, tarifa de servicio y total con redondeo .99. */
  cartTotals: (subtotalCents: number) => CartTotals;
};

function buildValue(rates: PricingRates): PricingContextValue {
  return {
    rates,
    riderPrice: (partnerDailyCents) => riderDailyPrice(partnerDailyCents, rates),
    cartTotals: (subtotalCents) => computeCartTotals(subtotalCents, rates),
  };
}

// Sin proveedor (galería de desarrollo, pruebas) se usan las tasas por defecto.
const PricingContext = createContext<PricingContextValue>(buildValue(DEFAULT_PRICING_RATES));

/** Carga las tasas una vez al abrir la app; mientras tanto (o si falla) rigen las de respaldo. */
export function PricingProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<PricingRates>(DEFAULT_PRICING_RATES);

  const load = useCallback(() => {
    fetchPricingRates().then(setRates);
  }, []);

  useEffect(load, [load]);

  const value = useMemo(() => buildValue(rates), [rates]);
  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function usePricing(): PricingContextValue {
  return useContext(PricingContext);
}
