# Plan: alinear el cobro real con el nuevo modelo de precios

> **Nada de esto está aplicado ni desplegado.** Son archivos para revisar.
> Piezas: `docs/PROPUESTA_PRECIOS_CONFIG.sql` (tabla y columnas) → `docs/PROPUESTA_PRECIOS_RPC.sql` (RPC) →
> `supabase/functions/kushki-charge/index.ts` (función) → app móvil (ya en el repo).
> La fórmula es la misma en los tres sitios y está probada en el cliente (`pnpm test:pricing`, 48 000+ comprobaciones).

## 1. Lo que hace hoy cada pieza (según `docs/Supabase Snippet Untitled query.csv` y la función)

> El archivo que citaste, `docs/rpc_definiciones.csv`, no existe; usé el único CSV con esas definiciones:
> `docs/Supabase Snippet Untitled query.csv` (sin versionar en git).

| Pieza | Qué calcula hoy |
| --- | --- |
| `get_cart_total()` | Σ `daily_price × cantidad × días` de `cart_items`, **a precio del Partner, sin comisión ni tarifa**. Para paquetes también multiplica por `ci.quantity`, aunque `create_cart_order` reserva el paquete una sola vez. |
| `create_booking` (5 args) | `subtotal = daily_price × días × cantidad`; `service_fee = ceil(subtotal × 0.05)`; `total = subtotal + fee`. Inserta en `bookings` con `total_price = total` y reparte unidades. |
| `create_package_booking` | `subtotal = daily_price(paquete) × días` (sin cantidad), misma tarifa del 5 %. |
| `create_cart_order` | Crea una fila en **`orders`** y, **por cada línea del carrito, una reserva** llamando a `create_booking` / `create_package_booking`. El total del pedido es la **suma de los totales por línea** (cada línea con su propio `ceil` del 5 %). Luego hace `update bookings set order_id` y `update orders set total_price`. |
| `kushki-charge` | Subtotal = `get_cart_total()` o `daily_price × días × qty`; **fee = `ceil(subtotal × 0.05)` y total = subtotal + fee**; cobra ese total en Kushki; luego llama al RPC. Si el RPC falla, anula el cobro. |
| `get_provider_bookings` | Solo lectura: devuelve `total_price` (lo que pagó el Rider). No devuelve desglose. |
| `provider_set_booking_status` | Solo cambia `status` (`ACTIVE` / `CANCELLED`). No toca montos. |
| `get_booking_for_provider_action` | Solo lee `status`, `total_price` y `kushki_ticket` (la función de reembolso devuelve `total_price`). |

**Dónde se reparte la comisión entre varios Partners hoy:** en ningún sitio explícito. Cada línea del carrito es una reserva del Partner de
esa línea y lleva su propio 5 %; no hay una comisión global que repartir. (La migración `20260804_multi_provider_checkout_orders.sql` del
repo sí reparte proporcionalmente, pero es el flujo de la **web** y usa la tabla `checkout_orders`; la app móvil usa `orders`.)

### Hallazgos importantes

1. **Ya hoy el cobro y las reservas pueden no cuadrar.** La función cobra `ceil(Σ subtotales × 0.05)` y las reservas suman `Σ ceil(subtotal_línea × 0.05)`.
   Con varias líneas pueden diferir unos centavos. El diseño nuevo calcula el total del pedido una sola vez y reparte esa tarifa.
2. **`create_booking` tiene dos sobrecargas** — `(uuid, date, date, text)` y `(uuid, date, date, text, integer DEFAULT 1)`.
   **El código usa la de 5 argumentos:** `kushki-charge` pasa `p_quantity`, `create_cart_order` la llama con 5 argumentos posicionales, y la app
   (`bookingsService.createBooking`) también manda `p_quantity`. **La antigua no la llama nadie a propósito y se puede eliminar.** Mientras convivan,
   una llamada de 4 argumentos puede ser ambigua. El SQL propuesto elimina las dos y crea una sola con `p_quantity` y `p_expected_total`.
3. **Los RPC de reserva son ejecutables por cualquier usuario autenticado** (la función los llama con el JWT del usuario) y `p_kushki_ticket`
   es opcional: **un usuario podría llamar `create_booking` directamente, sin pagar.** No lo cambié porque rompe el flujo actual, pero conviene
   cerrarlo (ver §6, «Siguiente paso recomendado»).
4. **La web usa otro camino:** `art-rider/services/cartCheckoutService.ts` calcula su propia cotización (5 % con `Math.round`) y **envía
   `p_subtotal`, `p_service_fee` y `p_total` a `create_multi_provider_checkout`**, que solo valida que sumen. Hay que alinearlo (§5).

## 2. Revisión de `PROPUESTA_PRECIOS_CONFIG.sql` contra los RPC reales

- **¿Algún RPC modifica `total_price` o `service_fee` después de insertar?** Ninguno de los siete revisados.
  - `create_cart_order` hace `update bookings set order_id = …`: solo cambia `order_id`. El trigger lo deja pasar.
  - `provider_set_booking_status` solo cambia `status`: pasa.
  - `update orders set total_price` actúa sobre **`orders`**, no sobre `bookings`, y el trigger es solo de `bookings`.
  - Las versiones nuevas ni siquiera hacen esos `UPDATE`: el pedido nace con sus montos finales y `order_id` entra en el `INSERT`.
- **Ajustes que hice al trigger** (`prevent_booking_pricing_mutation`): ahora solo protege reservas **con el modelo nuevo**
  (`partner_amount IS NOT NULL`); las anteriores conservan el comportamiento actual y el rol `service_role` puede corregir montos (soporte).
  Así no rompe herramientas que no conozco (paneles, reembolsos, scripts). Con eso **el trigger es seguro**.
- **Ajuste de tablas:** el CONFIG original agregaba columnas a `checkout_orders` (solo web). La app móvil guarda pedidos en `orders`;
  añadí sus columnas (`subtotal`, `service_fee`, `partner_amount`, tasas) y dejé `checkout_orders` condicionado a que exista.
- **Pendiente de verificar en la base real:** que `bookings` no tenga ya una columna `service_fee` con otro significado (el RPC
  `get_client_bookings` devuelve un `service_fee` que no sé de dónde sale). `ADD COLUMN IF NOT EXISTS` no la tocaría, pero la semántica debe coincidir
  (`service_fee = total_price − rider_subtotal`). Y que `cart_items` tenga `id` (lo asumo: la app borra por `item.id`).

## 3. Orden exacto de aplicación y despliegue

**Ventana:** hazlo en horario de poco tráfico. Entre el paso 4 y el paso 5 (minutos) no deben hacerse pagos, porque la función vieja cobra con
el cálculo viejo mientras los RPC ya usan el nuevo.

1. **Respaldo.** Copia de seguridad de la base (Dashboard → Database → Backups) y guarda las definiciones actuales: el CSV
   `docs/Supabase Snippet Untitled query.csv` ya es la «foto anterior» de los RPC; commitea o archiva ese archivo. Anota el commit actual de
   `supabase/functions/kushki-charge/index.ts` (para redeploy de reversa).
2. **Prueba en un proyecto de staging** (rama de Supabase o proyecto aparte con el mismo esquema): repite los pasos 3-6 allí y completa §4.
3. **Producción — `PROPUESTA_PRECIOS_CONFIG.sql`.** Es aditivo (tabla, funciones y columnas nulas); no cambia el comportamiento actual.
   Ejecútalo y comprueba: `SELECT * FROM pricing_settings;` (0.15 / 0.05) y los vectores de prueba que trae el archivo.
4. **Producción — `PROPUESTA_PRECIOS_RPC.sql`.** Ejecútalo entero (una transacción). A partir de aquí, los RPC calculan con el modelo nuevo y
   el precio de los equipos ya publicados se interpreta como **precio del Partner** (el Rider los ve un 15 % más caros).
   - *¿No quieres ese salto?* Antes del paso 4: `UPDATE listings SET daily_price = ROUND(daily_price / 1.15)` (y `packages`) para que el Rider siga viendo lo mismo.
5. **Desplegar `kushki-charge` inmediatamente después** (`supabase functions deploy kushki-charge`). Secretos necesarios: los que ya usa
   (`KUSHKI_PRIVATE_MERCHANT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`). Opcional: `REQUIRE_EXPECTED_TOTAL=true` (ver paso 7).
6. **Verificar sin cobrar** (§4, parte A) y luego **publicar la app** con los cambios del cliente (envía `expectedTotal`, maneja el 409). Importante: la app
   nueva **debe salir después** de la función nueva (con la función vieja, `expectedTotal` se ignora y los precios mostrados no coincidirían con lo cobrado).
7. **Versiones antiguas de la app:** muestran los precios viejos (sin comisión). Cuando la mayoría haya actualizado, activa
   `REQUIRE_EXPECTED_TOTAL=true` en la función: las versiones viejas recibirán «Actualiza la app» en vez de cobrarse un total que no vieron.
8. **Después:** el desglose exacto ya llega en `get_provider_bookings` (`partner_amount`, `rider_subtotal`) y Ganancias deja de decir «aprox.» para las reservas nuevas.

## 4. Cómo probar sin cobrar dinero real

La función apunta a Kushki **UAT** (`api-uat.kushkipagos.com`) y el formulario de la app usa `inTestEnvironment: true`: con tarjetas de prueba **no se
mueve dinero real**. (Los números de tarjeta de prueba vigentes están en la documentación de Kushki para UAT; no copio uno aquí para no darte
uno desactualizado. Verifica también que `EXPO_PUBLIC_KUSHKI_MERCHANT_ID` y `KUSHKI_PRIVATE_MERCHANT_ID` sean de **UAT**.)

**A. Solo cotizaciones (cero cobros), en SQL como usuario autenticado:**
```sql
SELECT * FROM get_booking_quote('<listing_id>', CURRENT_DATE + 7, CURRENT_DATE + 7, 1);   -- equipo de $80 → 9200 / 499 / 9699
SELECT * FROM get_cart_quote();                                                            -- con items en el carrito
```
**B. Función en local, sin desplegar:** `supabase functions serve kushki-charge --env-file <archivo-con-los-secretos-UAT>`, y desde la app apuntar
`EXPO_PUBLIC_SUPABASE_URL` a la instancia local, o con `curl` y un JWT de prueba.

**C. Casos a probar con tarjeta de prueba en UAT:**

| Caso | Resultado esperado |
| --- | --- |
| Un equipo de $80, 1 día | App y servidor: 92.00 + 4.99 = **96.99**; en Kushki UAT aparece un cargo de 96.99; la reserva guarda `partner_amount = 8000`, `rider_subtotal = 9200`, `service_fee = 499`, `total_price = 9699`. |
| Carrito con 2-3 equipos y varios días | `Σ total_price` de las reservas = `orders.total_price` = cargo en Kushki; el último de los repartos absorbe el resto. |
| Cambiar la tasa en `pricing_settings` con la pantalla de pago abierta y pagar | **409 `PRICE_CHANGED`**, **sin cargo**; la app muestra el nuevo total y pide pulsar «Pagar» otra vez. |
| Tarjeta rechazada (tarjeta de prueba de rechazo) | Mensaje del banco, sin reserva. |
| Sin disponibilidad / equipo propio / carrito vacío | Mensajes claros; si el cobro ya se hizo, se anula (revisar en Kushki UAT que el ticket queda anulado). |
| Reserva de un Partner que acepta/rechaza | Rechazar reembolsa exactamente el `total_price` de esa reserva. |

## 5. La web (`art-rider`)

No la toqué: **no es un cambio pequeño ni seguro.** Habría que (a) leer `pricing_settings` en `cartCheckoutService.ts` y `bookingsService.ts`
(`calculateBookingPrice`), (b) usar la misma fórmula (precio del Rider con comisión, `.99` una vez, `Math.round` → `ceil`), (c) cambiar
`create_multi_provider_checkout` para que **calcule él mismo** el desglose en vez de recibir `p_subtotal/p_service_fee/p_total` del
servidor web, y guardar `partner_amount`/tasas por reserva, y (d) decidir qué pasa con las propuestas de asesoría (`source = 'advisory'`),
que traen su propia comisión. Mientras tanto, **la web seguirá cobrando con el modelo viejo**: conviene no activar el modelo nuevo en producción hasta
alinear la web, o aceptar la diferencia de forma consciente.

## 6. Qué hace el cambio de la función y lo que queda por decidir

- Lee el total oficial de `get_booking_quote` / `get_package_quote` / `get_cart_quote`; **no usa precios ni tasas del cliente** (solo compara `expectedTotal`).
- Cobra **exactamente** ese total y lo pasa como `p_expected_total` al RPC; si las tasas cambian entre cobro y reserva, el RPC aborta y el cobro se anula.
- 409 `PRICE_CHANGED` con el desglose nuevo si no coincide con lo que vio el Rider (antes de cobrar).
- Errores con mensaje claro y código estable: sesión, carrito vacío, no disponible, fechas, cantidad, pasarela, rechazo del banco, y el caso grave
  (cobro sin reserva que no se pudo anular) que devuelve el ticket para soporte (`CHARGE_VOID_FAILED`).
- La app (`chargeService.ts`) envía `expectedTotal`, y ante el 409 muestra el nuevo total y pide pagar de nuevo; el token de Kushki se pide otra vez con el monto nuevo.
- **Siguiente paso recomendado (seguridad):** que los RPC de reserva dejen de ser ejecutables por usuarios y solo los use la función con `service_role`
  (recibiendo el id del usuario ya validado), o que exijan un `p_kushki_ticket` verificado. Hoy un usuario podría crear reservas sin pagar.

## 7. Cómo revertir

1. **Función:** `supabase functions deploy kushki-charge` con la versión anterior del archivo (`git show <commit-previo>:supabase/functions/kushki-charge/index.ts`).
2. **RPC:** ejecuta las definiciones del CSV `docs/Supabase Snippet Untitled query.csv` (cada una es un `CREATE OR REPLACE`). Antes elimina lo nuevo:
```sql
DROP FUNCTION IF EXISTS public.create_booking(uuid, date, date, text, integer, integer);
DROP FUNCTION IF EXISTS public.create_package_booking(uuid, date, date, text, integer);
DROP FUNCTION IF EXISTS public.create_cart_order(text, integer);
DROP FUNCTION IF EXISTS public.get_provider_bookings();
DROP FUNCTION IF EXISTS public.get_cart_quote(), public.get_booking_quote(uuid, date, date, integer), public.get_package_quote(uuid, date, date);
DROP FUNCTION IF EXISTS public._cart_lines(uuid), public._pricing_rates();
DROP FUNCTION IF EXISTS public._insert_listing_booking(uuid, uuid, date, date, integer, text, uuid, integer, integer, integer, numeric, numeric);
DROP FUNCTION IF EXISTS public._insert_package_booking(uuid, uuid, date, date, text, uuid, integer, integer, integer, numeric, numeric);
-- …y luego pegar las definiciones del CSV (create_booking ×2, create_package_booking, create_cart_order, get_cart_total, get_provider_bookings).
```
3. **Precios:** si en el paso 4 dividiste `daily_price` entre 1.15, multiplica de vuelta (`ROUND(daily_price * 1.15)`) solo si nadie editó precios desde entonces; si no, restaura desde el respaldo.
4. **Columnas y tabla** (opcional; son nulas y no estorban): `DROP TRIGGER trg_prevent_booking_pricing_mutation ON bookings;` y, si se quiere, `ALTER TABLE bookings DROP COLUMN partner_amount, …` y `DROP TABLE pricing_settings`.
   Las reservas creadas con el modelo nuevo conservan sus montos en `total_price` (lo que realmente se cobró): no se pierden.
5. **App:** vuelve a publicar la versión anterior. El cliente nuevo funciona (con tasas por defecto) incluso si la tabla no existe, pero no coincidirá con una función vieja.
