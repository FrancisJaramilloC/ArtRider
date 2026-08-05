# Carrito multi-proveedor

## Objetivo

Permitir que un cliente pague una sola vez con Kushki por equipos de varios
proveedores. La orden padre conserva el pago y se crea una reserva independiente
por proveedor para mantener compatibles los paneles y estados existentes.

## Flujo

1. El navegador conserva el carrito en `localStorage`. Todos los equipos usan el
   mismo rango de fechas.
2. `POST /api/cart/quote` vuelve a consultar precios, proveedores, unidades y
   bloqueos. Los valores del navegador nunca son autoritativos.
3. Kushki tokeniza la tarjeta en el navegador.
4. `POST /api/cart/charge` recalcula la cotización y ejecuta un solo cargo.
5. La función SQL `create_multi_provider_checkout` bloquea unidades disponibles
   y crea atómicamente `checkout_orders`, una reserva por proveedor y sus
   `booking_units`.
6. Si la transacción SQL falla después del cargo, el servidor intenta anular el
   pago completo.

## Advisory

El rider firmado reemplaza el carrito con sus equipos y cantidades. Ese carrito
queda bloqueado para que el pago corresponda exactamente con el PDF aceptado.
La cotización valida propiedad, fecha, estado, artículos y total de la propuesta.

## Reembolsos

Kushki Ecuador permite un solo reembolso parcial por transacción. Por esta razón,
las reservas rechazadas se acumulan y el reembolso se solicita una sola vez
cuando todos los proveedores respondieron. Después de un reembolso parcial, una
nueva cancelación requiere soporte manual.

## Despliegue

Aplicar `supabase/migrations/20260804_multi_provider_checkout_orders.sql` antes
de desplegar el código. El checkout nuevo depende de la tabla, columna y función
SQL creadas por esa migración. El checkout individual anterior continúa activo.
