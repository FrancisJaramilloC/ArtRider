> **Actualización:** este documento es el borrador inicial. Con las definiciones reales de los RPC se reemplaza por **docs/PROPUESTA_PRECIOS_PLAN.md** (orden de aplicación, pruebas, reversa), **docs/PROPUESTA_PRECIOS_RPC.sql** y el cambio en `supabase/functions/kushki-charge/index.ts`. En particular: la app móvil guarda los pedidos en `orders` (no `checkout_orders`) y cada línea del carrito es una reserva.

# Propuesta: cobro con el nuevo modelo de precios (servidor)

> **No aplicada.** Es lo que haría falta en Supabase / Edge Functions. Complementa `docs/PROPUESTA_PRECIOS_CONFIG.sql`.

## Estado actual (lo que encontré)

- **La app móvil NO cobra ni decide montos.** Llama a la Edge Function `kushki-charge` (`bookingsService.ts`, `cartService.ts`) enviando solo el
  token de Kushki y los ids (`listingId`/`packageId`/`cart: true`, fechas, cantidad). El monto lo calcula el servidor: el RPC
  `create_booking` / `create_package_booking` / `create_cart_order` devuelve `subtotal`, `service_fee` y `total`.
- Esos RPC y la Edge Function **no están en este repo**, así que no pude ver su código. La migración
  `20260804_multi_provider_checkout_orders.sql` sí muestra que el servidor **valida** `subtotal + service_fee = total` y que cada línea
  cumple `line_subtotal = unit_price × cantidad × días`, y reparte la comisión entre Partners.
- Lo que muestra la app (carrito, resúmenes, botón «Pagar $X» del formulario de Kushki) es solo **informativo**: se calcula en el cliente con
  `src/utils/pricing.ts`. Con el nuevo modelo sigue siendo informativo; **el monto real debe salir del servidor**.
- La web (`art-rider/services/cartCheckoutService.ts` y `bookingsService.ts`) tiene su propio cálculo (5 % sobre el subtotal con
  `Math.round`). También hay que alinearlo, porque comparte base de datos y pagos.

## Qué debe hacer el servidor en cada cobro

1. **Autenticar** al usuario (JWT) y **leer del servidor** el carrito/equipo/paquete. Nunca usar precios, tasas ni totales que envíe el cliente.
2. **Leer las tasas** de `pricing_settings` (`get_pricing_settings()`), con `service_role`.
3. **Calcular con la misma fórmula** que `src/utils/pricing.ts` (en SQL ya propuesta: `rider_daily_price`, `cart_total`, `round_to_99`):
   - precio Rider por línea = `ceil(daily_price_partner × (1 + partner_commission_rate))` (sin redondeo .99);
   - `subtotal` = Σ precio Rider × días × cantidad;
   - `total` = `cart_total(subtotal, service_fee_rate)` = redondeo .99 **una sola vez** sobre el carrito completo (mínimo: el subtotal);
   - `service_fee` = `total − subtotal`.
4. **Cobrar en Kushki exactamente `total`** (el monto sale del paso 3, no del cliente).
5. **Guardar en la misma transacción** de la reserva/pedido: `partner_amount` (precio del Partner × días × cantidad), `rider_subtotal`,
   `service_fee`, `total_price`, `partner_commission_rate`, `service_fee_rate` (y `checkout_orders.partner_amount` y tasas). El Partner recibe siempre
   `partner_amount`; ArtRider se queda con `total_price − partner_amount` (la columna `platform_revenue`).
6. **Pedidos con varios Partners:** por cada Partner, `partner_amount` y `rider_subtotal` son sus propias sumas; el `service_fee` total
   (`total − subtotal` del pedido) se reparte proporcionalmente al subtotal y el último Partner absorbe el resto (igual que hoy), de modo que
   `Σ total_price de las reservas = total del pedido` y cada reserva cumple `total_price = rider_subtotal + service_fee`.
7. **Reembolsos:** calcular sobre lo guardado (`total_price`), no sobre las tasas vigentes.
8. **Propuestas de asesoría (`source = 'advisory'`):** hoy llevan su propia comisión; decidir si siguen así o si usan el modelo nuevo.

## Defensa ante tasas que cambian mientras el Rider está pagando

La app muestra precios con las tasas que leyó al abrir. Si un administrador las cambia, el total mostrado puede diferir del real. Propuesta:

- La app envía `expectedTotal` (lo que el Rider vio). Si el servidor calcula otro total, **no cobra** y responde `409` con el nuevo desglose
  (`subtotal`, `service_fee`, `total`); la app lo muestra y pide confirmar de nuevo.
- Idealmente, una RPC `quote_cart()` / `quote_booking(...)` devuelve el desglose oficial para mostrarlo en los resúmenes y para el botón de
  Kushki, en vez de calcularlo en el cliente. (Hoy la app calcula localmente porque esa RPC no existe.)

## Lo que la app espera leer

- `pricing_settings`: `partner_commission_rate`, `service_fee_rate` (si no puede leerla, usa 0.15 y 0.05).
- `get_provider_bookings`: añadir `partner_amount` y `rider_subtotal` por reserva. Con eso Ganancias muestra el neto exacto (el precio del
  Partner) y el desglose «comisión + tarifa de servicio + redondeo»; sin ellos, estima y marca «aprox.».
- `listings.daily_price` / `packages.daily_price` pasan a significar **precio del Partner**. Los equipos ya publicados se reinterpretan así: el Rider
  los verá un 15 % más caros que hoy. Si no se quiere ese salto, hay que migrar los precios existentes (dividir entre 1.15) antes de activar el modelo.

## Qué hace cada cosa de la propuesta SQL

| Pieza | Para qué sirve |
| --- | --- |
| `pricing_settings` (1 fila, RLS solo lectura) | Guarda las tasas editables. Cualquiera las lee; solo `service_role`/admin las cambia. |
| `ceil_with_rate`, `rider_daily_price`, `round_to_99`, `cart_total` | La fórmula en SQL, idéntica a `pricing.ts`, para que RPCs y Edge Functions no la reimplementen y se desvíen. |
| `get_pricing_settings()` | Lectura de tasas dentro de RPCs/Edge Functions. |
| Columnas nuevas en `bookings` y `checkout_orders` | Congelan precio del Partner, subtotal, tarifa, total y **tasas usadas** en el momento de la compra. |
| `platform_revenue` (columna generada) | Ingreso de ArtRider = total − precio del Partner. |
| Trigger `prevent_booking_pricing_mutation` | Impide cambiar esos montos después de la compra. |

## Vectores de prueba (deben coincidir en cliente, SQL y Edge Function)

| Entrada | Resultado |
| --- | --- |
| Partner $80, 15 % | Rider $92.00 |
| Subtotal $92.00, 5 % | 96.60 → total **$96.99**; tarifa mostrada $4.99 |
| `round_to_99` de 9240 / 9251 / 9250 / 9660 | 9199 / 9299 / 9299 / 9699 |
| Resultado < $1 | valor exacto |

El cliente tiene 48 000+ comprobaciones en `pnpm test:pricing`.
