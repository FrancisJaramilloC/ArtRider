// Pruebas del modelo de precios. Ejecutar: pnpm test:pricing
import assert from 'node:assert/strict';

import { breakdownOf, computeCartTotals, DEFAULT_PRICING_RATES, estimatePartnerAmount, riderDailyPrice, riderLineTotal, roundTo99, sanitizeRates } from '../src/utils/pricing.ts';

const rates = DEFAULT_PRICING_RATES;
let checks = 0;
function eq<T>(actual: T, expected: T, label: string) {
  assert.deepEqual(actual, expected, label);
  checks += 1;
}

// Ejemplo de la especificación: 80 → 92.00 → 96.60 → total 96.99
eq(riderDailyPrice(8000, rates), 9200, 'precio Rider de $80');
eq(Math.ceil((9200 * 105) / 100), 9660, 'subtotal × 1.05 de $92');
eq(roundTo99(9660), 9699, '96.60 → 96.99');
const example = computeCartTotals(riderLineTotal(riderDailyPrice(8000, rates), 1, 1), rates);
eq(example, { subtotal: 9200, serviceFee: 499, total: 9699 }, 'carrito de un día de $80');
eq(example.subtotal + example.serviceFee, example.total, 'las líneas cuadran (92.00 + 4.99 = 96.99)');

// Redondeo .99 (empates hacia arriba)
eq(roundTo99(9240), 9199, '9240 → 9199');
eq(roundTo99(9251), 9299, '9251 → 9299');
eq(roundTo99(9250), 9299, '9250 → 9299');
eq(roundTo99(9249), 9299, '9249 (empate exacto en 92.50) → 9299');
eq(roundTo99(9660), 9699, '9660 → 9699');
eq(roundTo99(99), 99, 'un resultado < $1 usa el valor exacto (99)');
eq(roundTo99(60), 60, 'un resultado < $1 usa el valor exacto (60)');
eq(roundTo99(100), 100, '100 → n = 99 < $1 → valor exacto');
eq(roundTo99(150), 199, '150 → 199');

// El precio del Rider NO se redondea al .99 (solo el total final)
eq(riderDailyPrice(1001, rates), 1152, 'ceil(1001 × 1.15) = 1151.15 → 1152');
eq(riderDailyPrice(12340, rates), 14191, 'sin error de coma flotante (12340 × 1.15 = 14191 exacto)');
eq(riderDailyPrice(0, rates), 0, 'precio 0');

// Varios equipos y días: el redondeo se aplica una sola vez, al total (nunca por línea)
const lines = [
  riderLineTotal(riderDailyPrice(8000, rates), 3, 1), // 9200 × 3
  riderLineTotal(riderDailyPrice(2550, rates), 3, 2), // 2933 × 3 × 2
  riderLineTotal(riderDailyPrice(12340, rates), 2, 1), // 14191 × 2
];
const subtotal = lines.reduce((a, b) => a + b, 0);
const cart = computeCartTotals(subtotal, rates);
eq(subtotal, 27600 + 17598 + 28382, 'subtotal = suma de líneas sin redondear');
eq(cart.subtotal + cart.serviceFee, cart.total, 'subtotal + tarifa = total (carrito mixto)');
eq(cart.total % 100, 99, 'el total termina en .99');

// Invariante en muchos carritos: nunca hay descuadres de centavos y el total nunca baja del subtotal
for (let partner = 100; partner <= 200000; partner += 37) {
  for (const [days, qty] of [[1, 1], [2, 3], [7, 2]] as const) {
    const t = computeCartTotals(riderLineTotal(riderDailyPrice(partner, rates), days, qty), rates);
    assert.equal(t.subtotal + t.serviceFee, t.total);
    assert.ok(t.serviceFee >= 0, 'la tarifa de servicio nunca es negativa');
    // Termina en .99, salvo el caso < $1 (valor exacto) o el carrito muy pequeño donde el .99 quedaría bajo el subtotal.
    assert.ok(t.total % 100 === 99 || t.total === t.subtotal || t.total <= 149);
    checks += 3;
  }
}

// El Partner recibe su precio exacto; ArtRider absorbe el redondeo
const partnerAmount = 8000 * 1 * 1;
eq(breakdownOf(partnerAmount, example.total), { partnerAmount: 8000, total: 9699, platformRevenue: 1699 }, 'ingreso de ArtRider = total − precio del Partner');
assert.ok(Math.abs(estimatePartnerAmount(9699, rates) - 8000) <= 50, 'estimación del monto del Partner (reservas sin desglose): ±$0.50');
checks += 1;

// Tasas configurables
const custom = { partnerCommissionRate: 0.2, serviceFeeRate: 0 };
eq(riderDailyPrice(8000, custom), 9600, 'comisión 20 % → 96.00');
eq(computeCartTotals(9600, custom), { subtotal: 9600, serviceFee: 0, total: 9600 }, 'tarifa 0 %: el redondeo nunca deja una tarifa negativa');
eq(computeCartTotals(500, rates), { subtotal: 500, serviceFee: 0, total: 500 }, 'carrito pequeño: 5.25 → 4.99 sería menor al subtotal, se usa el subtotal');
eq(sanitizeRates(null), DEFAULT_PRICING_RATES, 'sin configuración → respaldo');
eq(sanitizeRates({ partnerCommissionRate: '0.2', serviceFeeRate: 'x' }), { partnerCommissionRate: 0.2, serviceFeeRate: 0.05 }, 'valores inválidos → respaldo por tasa');
eq(sanitizeRates({ partnerCommissionRate: 5, serviceFeeRate: -1 }), DEFAULT_PRICING_RATES, 'fuera de 0..1 → respaldo');

console.log(`OK: ${checks} comprobaciones de precios`);
