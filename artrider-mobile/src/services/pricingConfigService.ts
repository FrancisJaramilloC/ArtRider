import { DEFAULT_PRICING_RATES, sanitizeRates, type PricingRates } from '@/utils/pricing';

import { supabase } from './supabase';

/**
 * Lee las tasas de la tabla `pricing_settings` (ver docs/PROPUESTA_PRECIOS_CONFIG.sql). Nunca lanza: si la tabla no existe,
 * no hay filas, hay un error de red o los valores no son válidos, devuelve el respaldo (15 % / 5 %).
 * Ojo: es solo para MOSTRAR precios; el monto que se cobra lo calcula el servidor.
 */
export async function fetchPricingRates(): Promise<PricingRates> {
    try {
        const { data, error } = await supabase.from('pricing_settings').select('partner_commission_rate, service_fee_rate').limit(1).maybeSingle();
        if (error) {
            // Esperado mientras la tabla no exista o sin conexión: aviso en desarrollo, sin cuadro rojo.
            if (__DEV__) console.warn('[pricing] no se pudo leer pricing_settings; se usan las tasas por defecto:', error.message);
            return DEFAULT_PRICING_RATES;
        }
        return sanitizeRates({ partnerCommissionRate: data?.partner_commission_rate, serviceFeeRate: data?.service_fee_rate });
    } catch (error) {
        if (__DEV__) console.warn('[pricing] error leyendo pricing_settings; se usan las tasas por defecto:', error instanceof Error ? error.message : error);
        return DEFAULT_PRICING_RATES;
    }
}
