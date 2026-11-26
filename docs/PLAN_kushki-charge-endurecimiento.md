# Plan · Endurecimiento de `kushki-charge` (bloque 2)

- **Rama:** `fix/kushki-charge-endurecimiento` (desde `develop` @ `bbb0411`).
- **Servidor:** `supabase/functions/kushki-charge/index.ts` (+ `void.ts` nuevo), `docs/RUNBOOK_reembolsos.md` §4/§5.
- **Cliente (commit aparte):** `artrider-mobile`: `KushkiPaymentForm`, `chargeService.ts`, las 3 pantallas de checkout, `copy.ts` y un hook compartido.
- **Origen:** M2 y M3 diferidos en `docs/PLAN_pagos-reembolsos.md`, más la revisión del 2026-11-25.
- **Estado:** solo plan. Sin código, sin SQL ejecutado y sin deploy.
- **Fuera de alcance:**
  - la rama `cart: true` del servidor (se elimina en otro bloque);
  - la lógica de precios (`getQuote`, `expectedTotal`, `REQUIRE_EXPECTED_TOTAL`);
  - `contactDetails` fijos;
  - el rediseño del carrito;
  - el comportamiento del WebView de Kushki;
  - la idempotencia en el servidor (riesgo registrado, §7).

## Decisiones tomadas (2026-11-25)

| Duda | Decisión |
|---|---|
| 2 · RPC incierto y reserva no encontrada | **No anular.** Fila `CHARGE_VOID` / `MANUAL_REQUIRED`. |
| 3 · Falla el INSERT `PENDING` | **Anular igual** y responder incierto. |
| 4 · Rastro de cobro sin confirmar | Reutilizar `reason = 'CHARGE_VOID'` + `status = 'MANUAL_REQUIRED'` + **mensaje fijo**, sin SQL. |
| 5 · Ticket en la respuesta | El ticket **completo** (`ticketNumber`) va al cliente **solo si no se pudo guardar el rastro** en `payment_refunds`. En los demás casos, solo `Referencia …XXXX` (últimos 4), en el texto y sin campo `ticketNumber`. |
| 6 · Búsqueda por ticket | Solo listing y package. |
| 7 · Límite de tiempo | Peor caso del servidor ≈ 115 s con todos los pasos acotados y plazo previo al cobro de 25 s (cálculo en §10), por debajo de los 135 s del cliente (§4.2, §11). |
| 1 · Significado de D/E/F | **Confirmada:** D/E/F = la anulación terminó en SUCCEEDED (D) / FAILED (E) / UNKNOWN (F) pero falló el INSERT de la fila `CHARGE_VOID`. |

---

## 1. Flujo actual y dónde falla

```
validar → auth.getUser → getQuote → [privateKey] → COBRO Kushki → getServiceKey()+admin → RPC create_*_for
   → si falla: voidCharge (DELETE Kushki) → recordChargeVoid (INSERT después de anular, errores ignorados)
```

| # | Hueco | Consecuencia |
|---|-------|--------------|
| M3 | `getServiceKey()` y el cliente admin se crean **después** del cobro (línea 233). Si fallan, saltan al `catch` general → 500 `UNEXPECTED` "Inténtalo de nuevo". | Cobro sin reserva, sin anulación y sin rastro, y además se invita a pagar otra vez. |
| M2 | La fila `CHARGE_VOID` se inserta **después** del DELETE en Kushki. | Si la función muere entre medias, no queda rastro. |
| RPC perdida | El RPC puede hacer COMMIT y perderse la respuesta; hoy eso se anula. | Reserva creada y sin pago. |
| D/E/F | `recordChargeVoid` traga el error del INSERT y la respuesta no lo refleja. | Se afirma algo sin respaldo en la base de datos. |
| sin_transaction_status | 2xx con ticket pero sin `transactionStatus`: solo queda en `console.error`, sin ticket. | Cobro posible imposible de cruzar. |
| Timeout RPC | El RPC no tiene timeout propio. | La función puede morir antes de anular o registrar. |
| catch exterior | Cualquier excepción tras el cobro → `UNEXPECTED` "Inténtalo de nuevo". | Doble cobro si el Rider reintenta. |
| Cliente | El botón "Pagar" se reactiva en cuanto el WebView devuelve el token (`setProcessing(false)`), mientras el cobro sigue en curso. `fetch` no tiene timeout. Tras un error incierto se puede volver a pagar en la misma pantalla. | Doble toque = doble cobro; espera infinita. |

---

## 2. Restricciones de `payment_refunds` (de `docs/sql/2026-11-24_pagos_reembolsos.sql`)

| Restricción | Efecto en este plan |
|---|---|
| `payment_refunds_booking_required`: `booking_id IS NOT NULL OR reason = 'CHARGE_VOID'` | Sin reserva, solo se puede usar `reason = 'CHARGE_VOID'`; todos los rastros de este bloque lo usan. |
| Índice único parcial `payment_refunds_one_live_per_booking` … `WHERE booking_id IS NOT NULL` | **No aplica** a filas con `booking_id = null`: se pueden tener varias filas vivas sin conflicto. |
| `kushki_ticket text NOT NULL` | Sin ticket no hay fila (timeout del cobro, `sin_ticket`, `cuerpo_ilegible`): solo logs y runbook §5. |
| `amount_cents > 0` | Se usa `quote.total`, que siempre es > 0. |
| CHECK de `status` / `reason` | Estados usados: `PENDING`, `SUCCEEDED`, `FAILED`, `UNKNOWN`, `MANUAL_REQUIRED`. Motivo usado: siempre `CHARGE_VOID`. |
| Sin trigger de `updated_at` | El UPDATE pone `updated_at` a mano, como `setRefundStatus`. |
| Grants de `service_role`: SELECT/INSERT/UPDATE | Suficiente. |
| RLS sin políticas | Solo el cliente admin escribe, así que tiene que existir **antes** de cobrar (M3). |

**Búsqueda de la reserva por ticket:** en `public.bookings.kushki_ticket`, con `client_id = clientId`.
- Es lo que escriben `create_booking_for` y `create_package_booking_for` (`artrider-mobile/docs/PROPUESTA_C1_CREACION_SOLO_SERVIDOR.sql`).
- No hay índice UNIQUE: la unicidad la da `_assert_ticket_unused()` con `pg_advisory_xact_lock`.

### Mensajes fijos de `kushki_message` (duda 4)

Prefijo estable para filtrar en el runbook con `LIKE 'PREFIJO%'`. Sin interpolar nada; el motivo técnico va solo al log.

| Prefijo | Cuándo |
|---|---|
| `COBRO_SIN_CONFIRMAR: Kushki no confirmó el estado del cobro. No se intentó anular. Verificar en consola Kushki.` | §3.2 |
| `RPC_SIN_RESPUESTA: cobro aprobado y reserva no confirmada. Verificar bookings.kushki_ticket antes de anular.` | §3.4 |
| `ERROR_TRAS_COBRO: error inesperado después del cobro. Verificar reserva y cobro.` | §3.7 |
| `ANULACION_EN_CURSO` | Fila `PENDING` de §3.5 (luego se reemplaza por el resultado). |

---

## 3. Diseño del servidor

### 3.1 M3 · Configuración resuelta antes de cobrar

Después de `getQuote` y de la comprobación de `expectedTotal`, y antes del `fetch` a Kushki: validar `KUSHKI_PRIVATE_MERCHANT_ID` y `SUPABASE_URL`, y crear `admin` con `getServiceKey()`, todo dentro de un `try`.
- Si algo falla: 500 `PAYMENT_CONFIG` "El pago no está disponible en este momento. Inténtalo más tarde." **Sin cobrar.**
- En el log solo va `e.name`.
- Se elimina el `createClient(admin)` de la línea 233.

### 3.2 Cobro sin confirmar que trae ticket (`sin_transaction_status`, 408/5xx con ticket)

Si `kushkiData?.ticketNumber` es un string no vacío: INSERT `CHARGE_VOID` / `MANUAL_REQUIRED` / `COBRO_SIN_CONFIRMAR…`. No se anula.
- Respuesta: 502 `CHARGE_UNKNOWN`, con la regla de ticket de §3.6.
- Si el INSERT falla: log `ALERTA_SIN_RASTRO` con `ticketLast4`, y la respuesta incluye `ticketNumber` completo.

### 3.3 Timeout propio del RPC

- `RPC_TIMEOUT_MS = 15_000` con `.abortSignal(AbortSignal.timeout(...))`, solo en `create_booking_for` y `create_package_booking_for`.
- Clasificación pura (`classifyRpcOutcome`):
  - **OK:** hay `booking_id`.
  - **EXPLICIT_ERROR:** `status` ≥ 400 de PostgREST; hubo ROLLBACK.
  - **UNCERTAIN:** `status === 0` (abort, timeout o red), o 2xx sin `booking_id`.
- Abortar desde el cliente **no cancela** la transacción en Postgres; ver §3.4.

### 3.4 Respuesta del RPC perdida: buscar antes de anular

`findBookingByTicket(admin, ticket, clientId)` con un timeout de 5 s. Se ejecuta en todo camino de fallo excepto `TICKET_YA_USADO`.

| Resultado del RPC | Búsqueda | Acción |
|---|---|---|
| cualquiera | encontrada | 200 con ese `bookingId`. **No se anula.** Log `RESERVA_RECUPERADA`. |
| EXPLICIT_ERROR | no encontrada | Anular (§3.5). |
| UNCERTAIN | no encontrada | **No se anula** (duda 2). Fila `MANUAL_REQUIRED` / `RPC_SIN_RESPUESTA…`, 502 `CHARGE_UNKNOWN`. |
| cualquiera | la búsqueda falla | **No se anula.** Misma fila y misma respuesta. |

### 3.5 M2 · Anulación con rastro previo

1. **INSERT `PENDING`** (`booking_id` null, `CHARGE_VOID`, ticket, importe, `ANULACION_EN_CURSO`) con `.select('id').single()`.
2. **DELETE en Kushki**, igual que hoy: 2xx → SUCCEEDED, 4xx distinto de 408 → FAILED, y timeout, red, 408 o 5xx → UNKNOWN.
3. **UPDATE** al estado final: `.eq('id', rowId).eq('status', 'PENDING').select('id')`, exigiendo exactamente 1 fila. Pone `updated_at`.

- Resultado: `{ kushki: VoidResult; recorded: boolean }`. `recorded` es `true` solo si el INSERT y el UPDATE se confirmaron.
- **Si el INSERT `PENDING` falla (duda 3):** se anula igual. Después se intenta un INSERT con el estado final. Si también falla, `recorded = false` y log `ALERTA_SIN_RASTRO`.
- **Si el UPDATE falla:** la fila queda `PENDING` (el runbook §4 la cubre) y `recorded = false`.
- **Regla de ticket (§3.6):** una fila que quedó en `PENDING` es rastro suficiente para soporte. Por eso el ticket completo **solo** se envía si **no existe ninguna fila** de ese ticket (fallaron los dos INSERT). `recorded = false` por un UPDATE fallido sigue enviando solo `…XXXX`.

### 3.6 Respuestas y regla del ticket

**Regla de ticket (duda 5):**
- Si existe una fila con ese ticket en `payment_refunds` → solo `Referencia: …XXXX` en el texto y sin campo `ticketNumber`.
- Si no se pudo guardar ninguna fila → texto con `…XXXX` y además el campo `ticketNumber` completo.

**Regla de texto:**
- "No se te cobró nada" **solo** si `kushki === 'SUCCEEDED' && recorded === true`.
- Todo resultado incierto o fallido dice expresamente **"No pagues de nuevo"**.

| Caso | HTTP / code | Texto al Rider |
|---|---|---|
| Anulación SUCCEEDED y registrada | igual que hoy (`mapped`, p. ej. 409 `PRICE_CHANGED`) | el actual ("No se te cobró nada…") |
| Anulación SUCCEEDED sin registro completo (**D**) | 500 `CHARGE_VOID_FAILED` | "No pudimos confirmar el estado de tu pago. No pagues de nuevo: lo revisaremos y te avisaremos. Referencia: …XXXX" |
| Anulación FAILED (**E** si sin registro) | 500 `CHARGE_VOID_FAILED` | "Tu pago se realizó pero no pudimos crear la reserva ni anular el cobro. No pagues de nuevo: escríbenos con la referencia …XXXX." |
| Anulación UNKNOWN (**F** si sin registro) | 500 `CHARGE_VOID_FAILED` | "No pudimos confirmar la anulación del cobro. No pagues de nuevo: lo revisaremos y te avisaremos. Referencia: …XXXX" |
| No se anuló (§3.2, §3.4) o error tras cobro (§3.7) | 502 `CHARGE_UNKNOWN` | "No pudimos confirmar tu pago. No pagues de nuevo: revisa tus reservas en unos minutos o escríbenos. Referencia: …XXXX" |
| Cobro sin ticket (timeout o red al cobrar, sin ticket, cuerpo ilegible) | 502 `CHARGE_UNKNOWN` | el anterior sin referencia |

- Logs: siempre `ticketLast4`. Nunca el ticket completo ni el `error.message` de un `fetch` (puede llevar la URL con el ticket).

### 3.7 Bandera "cobro aprobado" y `catch` exterior (nuevo, a)

- `let chargedTicket: string | null = null`, declarada **fuera** del `try` principal.
- Se asigna **en cuanto** `kushkiData.ticketNumber` es un string no vacío, antes de evaluar `transactionStatus`.
- En el `catch` exterior:
  - **Con `chargedTicket`:** se intenta una fila `CHARGE_VOID` / `MANUAL_REQUIRED` / `ERROR_TRAS_COBRO…` (mejor esfuerzo, con su propio `try`, nunca relanza). Respuesta: 502 `CHARGE_UNKNOWN` "No pagues de nuevo", con la regla de ticket de §3.6. **Nunca** `UNEXPECTED` "Inténtalo de nuevo".
  - **Sin `chargedTicket`:** igual que hoy (`ApiError` mapeado o 500 `UNEXPECTED`).
- Esto también cubre los `ApiError` lanzados después del cobro. Con la bandera puesta, cualquier excepción es "cobro incierto".
- Si la excepción salta antes de que exista `admin`, no se puede escribir la fila. M3 lo hace imposible, pero en ese caso igualmente se envía el ticket completo.

### 3.8 Organización del código

`supabase/functions/kushki-charge/void.ts` contiene:
- `voidCharge`, `recordChargeEvent` (INSERT/UPDATE) y `findBookingByTicket`;
- funciones puras: `classifyChargeResponse`, `classifyRpcOutcome`, `chargeErrorResponse` (tabla §3.6 + regla de ticket);
- las constantes de mensajes fijos.

`index.ts` queda como orquestador. La rama carrito no cambia.

---

## 4. Diseño del cliente (`artrider-mobile`, commit aparte)

Cambio mínimo y compartido: sin rediseñar el carrito ni tocar el WebView de Kushki. Solo se añade una prop que desactiva el botón. Los textos nuevos van en `src/constants/copy.ts`.

### 4.1 Formulario bloqueado durante el cobro (c)

- `KushkiPaymentForm` recibe una prop nueva `disabled?: boolean`. El botón "Pagar" usa `disabled={!isValid || processing || disabled}`, y los `TextInput` usan `editable={!disabled}`.
- **Por qué hace falta:** hoy `processing` vuelve a `false` en `handleWebViewMessage` **antes** de que empiece el cobro, así que el botón se reactiva mientras la Edge Function trabaja.
- Las 3 pantallas (`checkout/summary/[id].tsx`, `checkout/package/summary/[id].tsx`, `checkout/cart-summary.tsx`) pasan `disabled={confirming || locked}`.
- Protección síncrona contra un doble `onSuccess` (doble toque o doble mensaje del WebView): un `useRef<boolean>` "en curso" en el hook compartido. El estado de React no basta, porque dos eventos seguidos pueden leer el valor anterior.
- Hook nuevo `src/hooks/usePaymentGuard.ts`:
  - devuelve `{ inFlight, locked, run(fn) }`;
  - `run` ignora la llamada si el ref está activo, marca `inFlight`, espera `fn()` y libera al final (`finally`);
  - si el resultado es incierto (§4.3), activa `locked`.

### 4.2 Timeout del `fetch` en `chargeService.ts` (d)

- `AbortController` con **`CHARGE_CLIENT_TIMEOUT_MS = 135_000`** (135 s; era 120 s, ver §11):
  - es mayor que el peor caso del servidor (≈ 115 s, cálculo en §10) con ≈ 20 s de margen para red y arranque en frío;
  - es 15 s menor que el límite de 150 s de la Edge Function, así que la app corta antes que la plataforma y siempre muestra **nuestro** mensaje.
- Al cortar (`AbortError`), devuelve `{ code: 'CHARGE_TIMEOUT', error: copy.paymentUncertain }`. Es un mensaje de cobro incierto ("No pagues de nuevo; revisa tus reservas"), no un error genérico.
- El `catch` de red actual (`NETWORK`) usa el mismo texto incierto y deja de pedir "antes de volver a intentarlo".
- **Respuesta no JSON o 5xx sin `code`** (p. ej. 504/546 de la plataforma): hoy cae en el genérico "No se pudo procesar el pago". Se trata como incierta (`code: 'CHARGE_UNKNOWN'`, `copy.paymentUncertain`), porque el servidor pudo haber cobrado.

### 4.3 Bloqueo tras un resultado incierto (e)

**Regla de clasificación** (`classifyChargeOutcome` en `chargeService.ts`): primero por `code`, después por estado HTTP.

1. **Inciertos (el cobro pudo hacerse):** `CHARGE_TIMEOUT`, `NETWORK`, `CHARGE_UNKNOWN`, `CHARGE_VOID_FAILED`, `UNEXPECTED`.
2. **Reintentables (cobro NO hecho):** `PAYMENT_CONFIG`, `PRICE_CHANGED`, `PAYMENT_DECLINED` (402), `QUOTE_FAILED`, `PRICING_UNAVAILABLE` y los 4xx con código conocido.
3. **Sin código conocido:**
   - un 5xx → incierto;
   - una respuesta que no es JSON → incierta;
   - cualquier otro 4xx → reintentable, porque son validaciones previas al cobro.
4. **Excepción:** `TICKET_ALREADY_USED` (409) se trata como **incierto**. Es el único 4xx que se produce después de un cobro aprobado y sin anularlo (no se anula para no tocar el cobro de otra reserva), así que reintentar podría cobrar dos veces.
5. **2xx sin `bookingId` ni `orderId`** → incierto.

- Con un resultado incierto, la pantalla pone `locked = true`:
  - el formulario queda desactivado;
  - bajo el `ErrorBanner` aparece **solo** un botón "Ver mis reservas", que reutiliza `goToReservationsAfterPayment(router)` de `utils/navigation`.
- **Desbloqueo al salir de la pantalla:** `useFocusEffect` con limpieza en el blur que pone `locked = false`. Si la pantalla se desmonta, el estado se pierde igualmente.
- `PRICE_CHANGED`, `PAYMENT_DECLINED`, `PAYMENT_CONFIG` y errores de validación **no** bloquean: no hubo cobro, o el rechazo es explícito.

### 4.4 Mensajes del servidor sin cambiar su sentido (f)

- Las pantallas ya muestran `result.error` tal cual (`priceChange.handle(result) ?? result.error`), y se mantiene así.
- El texto local solo se usa si el servidor no envió `error`:
  - en un código incierto, `copy.paymentUncertain`;
  - en los demás, el genérico actual.
- `ticketNumber`, si llega (solo cuando no hubo rastro, §3.6), se muestra debajo del mensaje con la etiqueta existente `copy.bookingPaymentReference`.
- El mensaje de error de tokenización de `KushkiPaymentForm` (`onError`) no cambia.

### 4.5 Archivos del cliente

`src/components/payment/KushkiPaymentForm.tsx` (prop), `src/services/chargeService.ts` (timeout, códigos inciertos, 5xx), `src/hooks/usePaymentGuard.ts` (nuevo), las 3 pantallas de checkout y `src/constants/copy.ts`.
- Verificación: `pnpm exec tsc --noEmit`, sin `any` ni `@ts-ignore`.
- `bookingsService.ts` y `cartService.ts` solo propagan `code` y `ticketNumber`. Hoy `ticketNumber` se pierde ahí: hay que añadirlo al objeto devuelto.

---

## 5. Orden de cambios

**Servidor** (commits pequeños, `deno check` en cada uno):
1. Extraer a `void.ts` sin cambiar el comportamiento.
2. **M3:** configuración antes del cobro → `PAYMENT_CONFIG`.
3. **Bandera `chargedTicket` + `catch` exterior** → `CHARGE_UNKNOWN` (§3.7).
4. **M2:** `voidCharge` en 3 fases con `{ kushki, recorded }`.
5. **Respuestas** (§3.6): "No pagues de nuevo", regla de ticket, D/E/F.
6. **Timeout del RPC** + `classifyRpcOutcome`.
7. **Búsqueda antes de anular** (§3.4).
8. **Rastro de `sin_transaction_status`** con ticket (§3.2).
9. Runbook §4/§5:
   - filas por prefijo (`COBRO_SIN_CONFIRMAR`, `RPC_SIN_RESPUESTA`, `ERROR_TRAS_COBRO`, `ANULACION_EN_CURSO`);
   - cruce con `bookings.kushki_ticket` antes de anular a mano.
10. `docs/PLAN_pagos-reembolsos.md`: M2/M3 resueltos.

**Cliente** (commit aparte, después del servidor):

11. `chargeService.ts`: timeout de 120 s (luego 135 s, §11), `isUncertainChargeCode` y 5xx inciertos; textos en `copy.ts`.
12. `usePaymentGuard` + prop `disabled` en `KushkiPaymentForm`.
13. Las 3 pantallas: `disabled`, bloqueo tras incierto, "Ver mis reservas", desbloqueo al salir.

Orden de despliegue recomendado:
- **Primero el servidor.** La app antigua ya muestra `data.error` tal cual, así que con el servidor nuevo recibe los textos "No pagues de nuevo".
- **Después la app.** La app nueva también funciona con el servidor antiguo: `CHARGE_UNKNOWN` y `CHARGE_VOID_FAILED` ya existen.
- Merge, push y deploy, solo con tu OK explícito.

---

## 6. SQL (opcional, NO se ejecuta)

Nada de §3 ni de §4 necesita SQL. Opcional para más adelante, en `docs/sql/`:
- `ALTER FUNCTION public.create_booking_for(...)` y `create_package_booking_for(...)` con `SET statement_timeout = '10s'`, menor que `RPC_TIMEOUT_MS`.
- Permitiría anular en "RPC incierto y no encontrada". Hoy queda descartado por la duda 2.

---

## 7. Riesgos

| Riesgo | Mitigación / estado |
|---|---|
| **Sin idempotencia en el servidor (registrado, NO se implementa ahora):** dos peticiones con tokens distintos (dos dispositivos, o la app reinstalada) generan dos cobros. | El bloqueo del cliente (§4) cubre el doble toque en un mismo dispositivo. La solución real va al **bloque A**: una llave por intento de pago, enviada por la app y única en la BD. |
| **Producción: `contactDetails` va fijo** en `kushki-charge` (email `test@artrider.com`, documento `1700000000`, nombre de prueba) | Aceptable en UAT. Antes de pasar a producción hay que enviar los datos reales del Rider (email y documento del perfil). No se cambia en este bloque. |
| RPC abortado que hace COMMIT después de la búsqueda | No se anula si el resultado es UNCERTAIN (§3.4). |
| Más filas `MANUAL_REQUIRED`/`PENDING` que revisar a mano | Se filtran por prefijo en el runbook. Volumen esperado: casi cero. |
| Tiempo: peor caso ≈ 115 s (cálculo en §10) | Cliente a 135 s (≈ 20 s de margen), límite de plataforma 150 s (15 s por encima del cliente). Si aun así la app corta antes, muestra "incierto" y el servidor deja igual su rastro. |
| El cliente corta a 135 s mientras el servidor sigue | Solo pasa si el servidor supera su propio peor caso. El mensaje es "incierto, no pagues de nuevo" y el rastro lo deja el servidor. |
| Rider bloqueado tras un incierto que en realidad fue bien | Solo puede ir a "Ver mis reservas", donde verá la reserva. Se desbloquea al salir de la pantalla. |
| Cambiar el orden altera los TS2345 de la línea base | `deno check` en cada commit: deben seguir siendo 4 TS2345 equivalentes. |
| `.abortSignal()` en `rpc()` con `esm.sh/@supabase/supabase-js@2` sin fijar | Confirmar con `deno check`. Si no existe: `Promise.race` + timeout. |
| `UNEXPECTED` antes del cobro también bloquea en el cliente | Conservador a propósito: el cliente no sabe si el error fue antes o después del cobro. |

---

## 8. Verificación

### 8.1 Estática

- **Servidor:** `deno check` de `kushki-charge/index.ts` y `void.ts`.
  - **Línea base aceptada:** 4 errores TS2345 en `kushki-charge` (hoy en las líneas 155, 281, 331 y 333). Deben seguir siendo esos 4, aunque cambien de línea; cualquier otro bloquea.
  - `client-cancel-booking` y `provider-respond-booking` deben seguir limpios.
- **Servidor:** `deno test` de las funciones puras. Casos clave:
  - D/E/F nunca devuelven "No se te cobró nada";
  - todo incierto o fallido contiene "No pagues de nuevo";
  - `ticketNumber` solo aparece cuando no hay fila;
  - con la bandera `chargedTicket`, el `catch` responde `CHARGE_UNKNOWN`.
- **Cliente:** `pnpm exec tsc --noEmit`.

### 8.2 Pruebas en iPhone con Kushki UAT (tras el deploy)

| Prueba | ¿Se puede? | Cómo / qué mirar |
|---|---|---|
| Pago aprobado (equipo y paquete) | **Sí** | Reserva creada y **ninguna** fila nueva en `payment_refunds`. |
| Tarjeta rechazada | **Sí** | 402 `PAYMENT_DECLINED`, sin fila y **sin** bloqueo de pantalla. |
| `PRICE_CHANGED` antes de cobrar | **Sí** | 409 sin cobro, sin fila y sin bloqueo. |
| **Doble toque rápido en "Pagar" → un solo cobro** (g) | **Sí** | Ver abajo. |
| Botón desactivado durante el cobro | **Sí** | Tras tocar "Pagar", el botón y los campos quedan grises hasta la respuesta. |
| Bloqueo tras incierto | **Parcial** | Activar el modo avión justo después de tocar "Pagar" (→ `NETWORK`). Debe quedar solo "Ver mis reservas"; al salir y volver, el formulario se desbloquea. ⚠️ El servidor puede haber cobrado: revisar en la consola UAT. |
| Timeout de 135 s del cliente | **No** a voluntad | Solo con `deno test`/simulación, o bajando la constante temporalmente en un build de desarrollo. |
| Anulación real (RPC falla tras cobrar) | **Difícil** | Solo por carrera: dos iPhones pagando la última unidad. No es reproducible a voluntad. |
| `PAYMENT_CONFIG`, timeout/5xx de Kushki, `sin_transaction_status`, RPC perdido, fallo de INSERT/UPDATE (D/E/F), `catch` con bandera | **No** | Solo revisión de código + `deno test` con dobles. |

**Prueba de doble toque (g):**
1. Iniciar sesión como un Rider de prueba. Ir al checkout de un equipo con varias unidades disponibles (para que un segundo cobro, si lo hubiera, **no** falle por stock y quede a la vista).
2. Llenar la tarjeta de prueba aprobada y tocar "Pagar" 3–4 veces lo más rápido posible. Repetir tocando también durante "Creando tu reserva…".
3. **Esperado en la app:** una sola pantalla de éxito; sin un segundo banner ni un segundo "Creando…".
4. **Verificación en la BD** (solo lectura, la ejecutas tú en el SQL Editor; muestra solo los últimos 4 del ticket):
   ```sql
   -- Reservas creadas por ese Rider en los últimos 10 minutos: debe salir 1 fila.
   SELECT id, status, total_price, right(kushki_ticket, 4) AS ticket_last4, created_at
   FROM public.bookings
   WHERE client_id = '<id del Rider de prueba>' AND created_at > now() - interval '10 minutes'
   ORDER BY created_at;

   -- Ninguna anulación ni rastro nuevo: debe salir 0 filas.
   SELECT id, reason, status, right(kushki_ticket, 4) AS ticket_last4, left(kushki_message, 25) AS msg, created_at
   FROM public.payment_refunds
   WHERE created_at > now() - interval '10 minutes'
   ORDER BY created_at;
   ```
5. **Verificación en la consola de Kushki UAT:** un solo cobro aprobado en esa franja, con los mismos últimos 4 del ticket.
6. **Fallo de la prueba:** 2 o más reservas, 2 o más cobros, o cualquier fila `CHARGE_VOID` (indicaría que hubo un segundo cobro anulado).
7. Repetir en la pantalla del paquete. El carrito se prueba igual, con `orders` en lugar de `bookings`, aunque su rama del servidor no cambia en este bloque.

---

## 9. Dudas

Ninguna abierta. Todas las decisiones están en la tabla "Decisiones tomadas" del principio.

---

## 10. Correcciones de la revisión independiente (2026-11-25)

| # | Corrección | Dónde |
|---|---|---|
| 1 | El ticket se valida con la MISMA condición que activa la bandera (string no vacío). Otro tipo = `sin_ticket` → cobro sin confirmar. | `index.ts` |
| 2 | `TICKET_YA_USADO`: búsqueda por `client_id` + `kushki_ticket`; reserva activa del Rider → éxito; si no → `MANUAL_REQUIRED` (`TICKET_YA_USADO: …`) + `CHARGE_UNKNOWN`. Nunca se anula (tampoco en carrito, que no busca). | `index.ts`, `void.ts` |
| 3 | Timeouts en todos los pasos (tabla abajo) y plazo previo al cobro de 25 s: si se supera, NO se cobra y se responde 408 `PRECHARGE_TIMEOUT` (reintentable). | `index.ts`, `void.ts` |
| 4 | La búsqueda lee `status`: solo `AWAITING_SIGNATURES`/`PAID`/`ACTIVE` cuentan como éxito; otro estado → `MANUAL_REQUIRED` (`RESERVA_NO_ACTIVA: …`). | `void.ts` |
| 5 | Un 408 del RPC es incierto (igual que `isUncertainHttpStatus`). | `void.ts` |
| 6 | Antes del INSERT de respaldo se comprueba si ya hay una fila `CHARGE_VOID` con ese ticket; si existe, no se inserta otra. | `void.ts` |
| 7 | Log del error del RPC: solo `code` y el mensaje truncado a 80 caracteres. | `index.ts` |
| 8 | Texto de `UNEXPECTED`: "No pudimos procesar el pago. Revisa tus reservas antes de intentarlo de nuevo." | `index.ts` |
| 9 | `decideAfterRpc(rpcOutcome, lookup, ticketAlreadyUsed)`: función pura con la tabla de decisiones. | `void.ts` |
| 10 | Tests: orden de eventos, filtros `.eq()`, UPDATE con `status='PENDING'`, tabla completa de `decideAfterRpc`, búsqueda por estado y `TICKET_YA_USADO`. | `void.test.ts` |
| 11 | `KushkiPaymentForm`: `submittingRef` (un solo token por envío; los mensajes no pedidos se descartan). | app |

**Tabla de `decideAfterRpc`** (la búsqueda solo se hace en listing/package; en carrito `lookup = null`):

| Resultado del RPC | Búsqueda | TICKET_YA_USADO | Acción |
|---|---|---|---|
| OK | — | — | éxito |
| cualquiera | encontrada y activa | cualquiera | éxito (no se anula) |
| cualquiera | encontrada, no activa | cualquiera | `MANUAL_REQUIRED` · `RESERVA_NO_ACTIVA` |
| cualquiera | error | cualquiera | `MANUAL_REQUIRED` · `RPC_SIN_RESPUESTA` |
| cualquiera | no encontrada / sin búsqueda | sí | `MANUAL_REQUIRED` · `TICKET_YA_USADO` |
| incierto | no encontrada / sin búsqueda | no | `MANUAL_REQUIRED` · `RPC_SIN_RESPUESTA` |
| error explícito | no encontrada / sin búsqueda | no | **anular** |

**Peor caso total (todos los pasos acotados):**

| Tramo | Límite |
|---|---|
| Antes del cobro (`getUser` 5 s + cotización 5 s + lectura del cuerpo): si al llegar al cobro pasaron más de **25 s**, no se cobra | ≤ 25 s |
| Cobro en Kushki (conexión + cuerpo) | 25 s |
| RPC de reserva | 15 s |
| Búsqueda por ticket | 5 s |
| Rama más larga tras la búsqueda — anular: INSERT PENDING 5 s + DELETE Kushki 25 s + (UPDATE 5 s, o comprobación 5 s + INSERT de respaldo 5 s) + cotización de `PRICE_CHANGED` 5 s | 45 s |
| **Total** | **≈ 115 s** |

- La otra rama (`MANUAL_REQUIRED`) suma 25 + 15 + 5 + 5 = 50 s después del plazo previo. El rastro del `catch` exterior (5 s) sustituye a los pasos que faltaban, no se suma al final.
- 115 s < 120 s (objetivo original del cliente) < 135 s (timeout actual del cliente, §11) < 150 s de la plataforma.
- Se eligió un plazo previo de **25 s** (no 30 s): con 30 s el total llegaría a 120 s, el timeout original del cliente.
- Las filas `TICKET_YA_USADO` y `RESERVA_NO_ACTIVA` aparecen en la consulta general de `MANUAL_REQUIRED` del runbook §4.3. Su tabla de prefijos aún no las nombra (deuda, §11).

---

## 11. Segunda revisión (commit f20c8b4): correcciones y deuda

### Aplicado

| # | Cambio | Dónde |
|---|---|---|
| 1 | Rama carrito: `create_cart_order_for` con timeout propio (15 s) y `classifyRpcOutcome`. Un resultado incierto (timeout, status 0, 408, 5xx sin SQLSTATE) **no se anula**: `decideAfterRpc` con `lookup = null` da `MANUAL_REQUIRED` (`RPC_SIN_RESPUESTA`) + `CHARGE_UNKNOWN`. Solo un error explícito anula. **No se busca el pedido por ticket** (`orders.kushki_ticket`): el carrito se elimina en otro bloque. | `index.ts` |
| 2 | Tests: el doble registra cada `.abortSignal()` real; test exhaustivo de `decideAfterRpc` (30 combinaciones, VOID solo en 2). | `void.test.ts` |
| 3 | `KushkiPaymentForm`: si el WebView no responde en 30 s, se libera el envío y se muestra "No pudimos validar tu tarjeta. Inténtalo de nuevo." (sin token no hay cobro). El temporizador se limpia con cualquier mensaje y al desmontar. Un token que llegue después se descarta. | app |
| 4 | `CHARGE_CLIENT_TIMEOUT_MS` = **135 s** (antes 120 s). | `chargeService.ts` |

### Tiempos con el carrito acotado y el cliente a 135 s

| Camino | Peor caso del servidor |
|---|---|
| Listing/package, rama de anulación | 25 (plazo previo) + 25 (cobro) + 15 (RPC) + 5 (búsqueda) + 45 (anulación con registro y cotización) = **≈ 115 s** |
| Listing/package, `MANUAL_REQUIRED` | 25 + 25 + 15 + 5 + 5 = ≈ 75 s |
| Carrito, rama de anulación (sin búsqueda) | 25 + 25 + 15 + 45 = ≈ 110 s |
| Carrito, `MANUAL_REQUIRED` | 25 + 25 + 15 + 5 = ≈ 70 s |
| Cobro sin confirmar (con ticket) | 25 + 25 + 5 = ≈ 55 s |

- Margen del cliente sobre el peor caso del servidor: 135 − 115 = **≈ 20 s**, para la red de ida y vuelta y el arranque en frío, que no cuentan en el reloj del servidor.
- Margen de la plataforma sobre el cliente: 150 − 135 = **15 s**. La app corta antes que la plataforma y siempre muestra su propio mensaje (incierto, "No pagues de nuevo").

### Deuda registrada (NO implementada)

| Id | Deuda | Por qué no ahora |
|---|---|---|
| m-a | **Token tardío de un envío anterior:** si el envío A caduca (30 s) y el Rider reintenta (C), un token tardío de A puede llegar antes que el de C y aceptarse como el de C; el de C se descarta. Sigue habiendo un solo cobro, pero con el token de A (que pudo pedirse con otro importe). | Arreglarlo exige numerar los envíos y devolver el número desde el HTML del WebView, y CLAUDE.md prohíbe tocar su comportamiento. |
| m-b | **La búsqueda por ticket acepta cualquier reserva activa del Rider con ese ticket**, sin comprobar `listing_id`/`package_id` ni fechas. Con `TICKET_YA_USADO`, en teoría podría responder éxito con una reserva de otra compra. | Requiere que Kushki repita un ticket: no es realista. |
| m-c | **Si la fila ya existía antes del INSERT de respaldo, se queda en `PENDING`** aunque ya se sepa el resultado de Kushki. `chargeEventExists` debería devolver el `id` para cerrarla con `finishChargeEvent`. | El runbook §4.1 la recoge a los 10 min; es solo trabajo manual extra. |
| runbook | **El runbook §4.3 no nombra los prefijos `TICKET_YA_USADO` ni `RESERVA_NO_ACTIVA`**. Las filas sí salen en su consulta general de `MANUAL_REQUIRED`. | Fuera de la lista de este commit. |
| carrito | **El carrito no busca su pedido por ticket** (`orders.kushki_ticket`) antes de decidir. | La rama del carrito se elimina en otro bloque. |
