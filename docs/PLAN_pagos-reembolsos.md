# PLAN · Pagos y reembolsos (bloque 1)

- **Rama:** `fix/pagos-reembolsos` (cortada de `develop` actualizada).
- **Fecha:** 2026-11-24 · **Autor del plan:** Claude (Opus, chat) · **Implementa:** Claude Code (Opus, esfuerzo Medio) · **Revisa:** Claude Code (Sonnet), sesión aparte.
- **Origen:** hallazgos H1, H2 y H3 de Notion "Backlog crítico · ArtRider" (2026-11-24), verificados en solo lectura contra producción.
- **Regla:** Claude Code implementa SOLO lo que dice este archivo. Si algo del plan no cuadra con el código real, se detiene y lo reporta; no improvisa.

---

## 1. Problema (resumen verificado)

| # | Qué pasa | Dónde | Evidencia |
|---|---|---|---|
| H1 | El Partner puede finalizar una reserva ACTIVE/PAID antes de que ocurra; su monto pasa a "Ganado". | RPC `public.provider_finalize_booking` (SECURITY DEFINER, EXECUTE para `authenticated`) | No lee `end_date`. Bug QA #36. |
| H2 | Un carrito se cobra con UN ticket Kushki y Kushki respondió "Solo se permite un reembolso parcial por transacción". El 2.º ítem rechazado/cancelado de un mismo pedido no se puede reembolsar. No hay registro de reembolsos en la base. | `provider-respond-booking` (v2 desplegada), `client-cancel-booking` (v1) | Pedido `41b0ba1f-f924-4286-a5c0-8df325b98766`: 3 ítems para el 25-nov; `443bdfa3…` ($6.04) CANCELLED; `7a3ee51a…` ($48.27) AWAITING_SIGNATURES; `9d741332…` ($120.68) ACTIVE. |
| H2b | `provider-respond-booking` no tiene timeout hacia Kushki y no hay nada que impida dos reembolsos simultáneos de la misma reserva (Partner rechaza + Rider cancela a la vez). | `provider-respond-booking` | Código desplegado v2. |
| H3 | `client-cancel-booking` usa `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` directo: se rompe al desactivar las llaves legacy. Mismo límite de Kushki. | `client-cancel-booking` | Código desplegado v1. `kushki-charge` (v6) tiene el mismo problema de llaves. |

> ⚠️ Mientras este bloque no esté desplegado: **no rechazar ni cancelar** la reserva `7a3ee51a…` ($48.27, 25-nov) ni la `9d741332…` en UAT. Su reembolso fallará (H2).

## 2. Decisiones

- **D1 (tomada):** una reserva se puede finalizar **desde el día de su `end_date`** (hora de Ecuador, `America/Guayaquil`), no antes. Los eventos son de tarde/noche y el desmontaje es esa misma noche. Cuando exista la hora de fin del evento (spec "Reserva por solicitud"), se cambia a fecha+hora.
- **D2 (pendiente de Kushki, va en la Fase B):** cómo reembolsar varios ítems de un mismo cobro. Opciones: (a) Kushki habilita varios reembolsos parciales; (b) preautorizar y capturar por ítem cuando el Partner acepta; (c) un cobro por ítem o por Partner. Recomendación inicial: (b), que además coincide con "autorizar/capturar en vez de cobrar y reembolsar" del backlog. **No se implementa en este bloque.** Se pidió confirmación a soporte de Kushki.
- **D3 (CONFIRMADA por Emilio):** cuando un reembolso parcial no se puede hacer automáticamente (el ticket ya tiene uno), la reserva **sí** pasa a CANCELLED, el reembolso queda registrado como `MANUAL_REQUIRED` y ArtRider lo procesa a mano en la consola de Kushki (`docs/RUNBOOK_reembolsos.md` §3). La función responde `success: true, manualRefund: true` y al Partner se le muestra "Rechazada. ArtRider procesará el reembolso del Rider". (Se descartó la alternativa de bloquear el rechazo y dejar la reserva pendiente: peor para el Rider.)

## 3. Fase A (este bloque; no depende de Kushki)

### A1 · SQL (archivo `docs/sql/2026-11-24_pagos_reembolsos.sql`, ya escrito y revisado aparte; lo corre Emilio)
1. `provider_finalize_booking`: bloquea la fila (`FOR UPDATE`) y rechaza si `end_date > hoy en Ecuador`. **(Re-review N1)** También rechaza si la reserva tiene una fila viva en `payment_refunds` (`PENDING`/`SUCCEEDED`/`UNKNOWN`/`MANUAL_REQUIRED`), con un mensaje que empieza por "Solo puedes finalizar" (la app lo muestra tal cual). Evita que una reserva reembolsada o con reembolso incierto pase a "Ganado". Resto del comportamiento igual.
2. Tabla nueva `public.payment_refunds` (solo servidor: RLS activo, sin políticas, sin permisos para `anon`/`authenticated`):
   - `id`, `booking_id` (nullable solo para `CHARGE_VOID`), `order_id`, `kushki_ticket`, `amount_cents`, `reason` (`PROVIDER_REJECT` | `CLIENT_CANCEL` | `CHARGE_VOID` | `MANUAL`), `status` (`PENDING` | `SUCCEEDED` | `FAILED` | `UNKNOWN` | `MANUAL_REQUIRED`), `kushki_code`, `kushki_message`, `created_at`, `updated_at`.
   - Índice único parcial: **un solo reembolso vivo por reserva** (`status IN ('PENDING','SUCCEEDED','UNKNOWN','MANUAL_REQUIRED')`). Esto impide el doble reembolso aunque Partner y Rider actúen a la vez. `FAILED` no bloquea reintentos.
3. Backfill: registra el reembolso del incidente (`443bdfa3…`, $6.04 = 604 centavos) como **`SUCCEEDED`** (actualizado 2026-11-25: confirmado en la consola de Kushki UAT, reembolso parcial aprobado el 2026-11-20). Así el sistema sabe que ese ticket ya tiene un reembolso parcial: un nuevo intento sobre `443bdfa3…` devuelve `ALREADY_REFUNDED`, y rechazar/cancelar `7a3ee51a…` o `9d741332…` termina en `MANUAL_REQUIRED` por la guardia H2.

### A2 · `supabase/functions/_shared/refunds.ts` (nuevo)
Función `refundBooking(admin, { bookingId, reason })` que devuelve uno de: `REFUNDED`, `ALREADY_REFUNDED`, `NO_CHARGE`, `MANUAL_REQUIRED`, `IN_PROGRESS`, `FAILED`, `UNKNOWN`. Pasos, en este orden:
1. Lee la reserva con el cliente admin: `id, order_id, total_price, kushki_ticket, status`. Sin ticket → `NO_CHARGE`.
2. Inserta fila `PENDING` en `payment_refunds`. Si choca con el índice único: si la existente es `SUCCEEDED` → `ALREADY_REFUNDED`; si es `PENDING`/`UNKNOWN` → `IN_PROGRESS`; si es `MANUAL_REQUIRED` → `MANUAL_REQUIRED`. **En ninguno de esos casos se llama a Kushki.**
3. Guardia H2: si el pedido tiene más de una reserva y ya existe otra fila viva (no `FAILED`) con el mismo `kushki_ticket` → actualiza la fila a `MANUAL_REQUIRED` y devuelve `MANUAL_REQUIRED` sin llamar a Kushki. *(Revisión, I3)* Si ese `UPDATE` no se puede guardar, devuelve **`IN_PROGRESS`** (409 `REFUND_IN_PROGRESS`): la reserva no se cancela con una fila `PENDING` colgada.
4. Llama `DELETE {KUSHKI_BASE_URL}/v1/charges/{ticket}` con el monto de ESA reserva y `AbortSignal.timeout(25_000)`. `KUSHKI_BASE_URL` sale de una constante compartida (hoy UAT).
5. Respuesta OK → `SUCCEEDED`. **4xx explícito de Kushki (distinto de 408) → `FAILED`** con `kushki_code`/`kushki_message`. **Timeout, error de red, HTTP 408 o 5xx → `UNKNOWN`** (no se reintenta solo: puede haberse hecho; se revisa en la consola). *(Re-review N3: antes cualquier error HTTP era `FAILED`, lo que permitía reintentar tras un 5xx en el que Kushki sí hubiera reembolsado. Lo mismo aplica a `voidCharge` en `kushki-charge`.)* *(Revisión, I3)* El estado final se guarda con un `UPDATE` que debe afectar exactamente 1 fila. Si no se puede guardar `SUCCEEDED` o `FAILED`, se devuelve **`IN_PROGRESS`** (409 `REFUND_IN_PROGRESS`) y la reserva no cambia: la fila queda `PENDING` y se resuelve con el runbook §2. Si no se puede guardar `UNKNOWN`, se devuelve `UNKNOWN` igual (la fila `PENDING` bloquea igual y la reserva tampoco cambia).
6. Nunca registra llaves, tokens ni datos de tarjeta en logs ni en la tabla.

### A3 · `provider-respond-booking`
- Usa `getPublishableKey()` / `getServiceKey()` de `_shared/keys.ts` (ya lo hace para la publishable).
- `accept` *(cambiado en la revisión, I1)*: tras validar propiedad, consulta `payment_refunds` con la service key por filas vivas de la reserva (`LIVE_REFUND_STATUSES`, exportada de `_shared/refunds.ts`: `PENDING`/`SUCCEEDED`/`UNKNOWN`/`MANUAL_REQUIRED`). Si hay alguna → 409 `REFUND_IN_PROGRESS` ("Esta reserva tiene un reembolso en curso o ya fue cancelada.") y no acepta. Si la consulta falla → 500 genérico y no acepta. Si no hay → `provider_set_booking_status(..., 'ACTIVE')` como antes.
- `reject`: valida propiedad con `get_booking_for_provider_action` (igual que hoy) → *(revisión, I2)* lee el estado actual y exige `REJECTABLE_STATUSES` (`AWAITING_SIGNATURES`, `PAID`, `ACTIVE`); si no → 409 `INVALID_STATE` ("La reserva ya no está en un estado que permita rechazarla.") sin reembolsar → `refundBooking(..., 'PROVIDER_REJECT')` → según resultado:
  - `REFUNDED` / `ALREADY_REFUNDED` / `NO_CHARGE` / `MANUAL_REQUIRED` (D3 confirmada) → `provider_set_booking_status(..., 'CANCELLED')`. Con `MANUAL_REQUIRED` responde `success: true, manualRefund: true` y el mensaje "Rechazada. ArtRider procesará el reembolso del Rider".
  - `IN_PROGRESS` → 409 `REFUND_IN_PROGRESS`, sin cambiar estado.
  - `FAILED` → 502 `REFUND_FAILED`, sin cambiar estado (se puede reintentar).
  - `UNKNOWN` → 502 `REFUND_UNKNOWN`, sin cambiar estado; mensaje "Estamos verificando el reembolso; no lo intentes de nuevo".
- Respuestas con `code` estable (mismo estilo que `client-cancel-booking`). Si el estado no se pudo actualizar después de un reembolso `SUCCEEDED`, 500 `STATE_UPDATE_FAILED` + `console.error` con el bookingId (como hoy).

### A4 · `client-cancel-booking`
- Reemplaza `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` por `getPublishableKey()` / `getServiceKey()`.
- Usa `refundBooking(..., 'CLIENT_CANCEL')` con el mismo mapeo que A3. Mantiene el UPDATE condicional a `AWAITING_SIGNATURES` que ya tiene.

### A5 · `kushki-charge` (solo endurecer; se DESPLIEGA en el bloque 2, rotación de llaves)
- Llaves por `_shared/keys.ts`.
- `AbortSignal.timeout` en el cobro (25 s) y en `voidCharge` (25 s).
- `voidCharge` registra una fila `CHARGE_VOID` (sin `booking_id`) con su resultado (`SUCCEEDED` / `FAILED` solo con 4xx / `UNKNOWN` con timeout, red, 408 o 5xx).
- *(Revisión, I3/N2)* Nuevo código **`CHARGE_UNKNOWN`** (502): cuando no se sabe si Kushki cobró — timeout o red, HTTP 408/5xx, respuesta 2xx con cuerpo ilegible, sin `ticketNumber` o sin `details.transactionStatus`. Nunca dice "no se te cobró". `PAYMENT_DECLINED` queda solo para un 4xx explícito o un `transactionStatus` presente y distinto de `APPROVAL`.
- **No** tocar la lógica de precios, cotización ni creación de reservas.

### A6 · App móvil (`artrider-mobile/`)
- Botón "Finalizar reserva" del Partner: oculto o deshabilitado antes del `end_date` (texto: "Podrás finalizarla desde el {fecha}"). El servidor ya lo bloquea; esto es solo UX.
- Mostrar mensajes claros para los códigos nuevos: `REFUND_IN_PROGRESS`, `REFUND_FAILED`, `REFUND_UNKNOWN`, y el caso `MANUAL_REQUIRED` ("Rechazada. ArtRider procesará el reembolso del Rider").
- Ubicar los archivos con `grep` de `provider_finalize_booking`, `provider-respond-booking` y `client-cancel-booking`. Cambios mínimos; sin rediseño.

## 4. Fase B (después de la respuesta de Kushki; plan aparte)
Implementar D2. Se escribirá `docs/PLAN_pagos-autorizar-capturar.md` (o el que corresponda) cuando Kushki responda.

## 5. Archivos a tocar
- `docs/PLAN_pagos-reembolsos.md` (este archivo) y `docs/sql/2026-11-24_pagos_reembolsos.sql`.
- `docs/RUNBOOK_reembolsos.md` (nuevo, re-review N5): cómo resolver a mano los reembolsos inciertos.
- `supabase/functions/_shared/refunds.ts` (nuevo).
- `supabase/functions/provider-respond-booking/index.ts`.
- `supabase/functions/client-cancel-booking/index.ts`.
- `supabase/functions/kushki-charge/index.ts` (solo A5).
- `artrider-mobile/` solo los archivos que encuentre el grep de A6.

**NO tocar:** `art-rider/` (web), `main`, `.env*`, llaves o secretos, `upload-listing-cover`, RPCs de precios/cotización, migraciones fuera del archivo SQL de este plan.

## 6. Orden de ejecución (cada paso con OK de Emilio)
1. Claude Code (Opus, Medio) implementa A2–A6 **sin commit** y reporta.
2. Claude Code (Sonnet, sesión nueva) revisa el diff y el SQL contra este plan.
3. Emilio corre el SQL A1 en el SQL Editor (BEGIN/COMMIT) y pega la verificación. **Obligatorio ANTES de desplegar `provider-respond-booking`:** la función nueva consulta `payment_refunds` al aceptar; sin la tabla, cada aceptación daría 500.
4. Commit en la rama → merge `--no-ff` a develop → push (Emilio confirma).
5. Desde develop actualizada: deploy `provider-respond-booking`, probar; luego deploy `client-cancel-booking`, probar. `kushki-charge` se despliega en el bloque 2.
6. Borrar la rama con `git branch -d`.

## 7. Criterios de "terminado"
- [ ] Finalizar una reserva con `end_date` futuro devuelve error (servidor) y la app no ofrece el botón.
- [ ] Finalizar el día del `end_date` funciona.
- [ ] Cada intento de reembolso deja una fila en `payment_refunds` con su estado.
- [ ] Dos llamadas simultáneas de reembolso para la misma reserva producen como máximo UNA llamada a Kushki.
- [ ] El 2.º ítem de un mismo pedido termina en `MANUAL_REQUIRED` (D3) sin error 500.
- [ ] `client-cancel-booking` y `kushki-charge` ya no leen `SUPABASE_ANON_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` directamente.
- [ ] `pnpm tsc --noEmit` limpio en `artrider-mobile`; `deno check` limpio en las funciones (si Deno está instalado).
- [ ] Revisión de Sonnet sin bloqueantes.

## 8. Pruebas en el iPhone (las hace Emilio)
Sin Kushki (se pueden hacer ya):
1. Partner con una reserva ACTIVE para una fecha futura → "Finalizar" no aparece o da error claro.
2. Partner rechaza una reserva **sin ticket** (si existe una de prueba) → CANCELLED, fila `NO_CHARGE` no se crea.
Con Kushki UAT activo:
3. Carrito de 2 ítems → Partner rechaza el 1.º → `SUCCEEDED` y dinero devuelto en consola.
4. Rechazar el 2.º → `MANUAL_REQUIRED`, sin 500; mensaje correcto.
5. Rider cancela una reserva pendiente de un solo ítem → `SUCCEEDED`.
6. Tocar dos veces seguidas "Rechazar" → una sola fila viva, un solo reembolso en Kushki.

## 9. Riesgos
- **Producción sin backups:** el SQL crea una tabla y reemplaza una función; no borra datos. Reversa de emergencia: la definición anterior de `provider_finalize_booking` está comentada al final del SQL.
- **Kushki UAT inaccesible:** las pruebas 3–6 quedan bloqueadas; el resto avanza.
- **Reglas de Kushki sin documentar** (la documentación de Ecuador pide contraseña): la guardia H2 asume "un solo reembolso parcial por ticket" según el error real recibido.
- **Rider no ve el estado del reembolso** en la app: queda para la Fase B.
- **Orden de despliegue:** el SQL A1 va antes que `provider-respond-booking` y `client-cancel-booking` (ver §6, paso 3). Sin `payment_refunds`, aceptar da 500 y rechazar/cancelar falla al registrar el reembolso.
- **Riesgos residuales conocidos y diferidos** (aceptados para este bloque):
  - **N4 · carrera aceptar/cancelar:** en `accept`, la consulta de reembolsos vivos y el cambio a ACTIVE no son atómicos. Si el Rider cancela justo entre ambos, la reserva puede quedar ACTIVE con el reembolso hecho (se detecta: fila `SUCCEEDED` + log `REEMBOLSO HECHO PERO ESTADO NO ACTUALIZADO`). Ventana de milisegundos.
  - **M1 · carrera finalizar/rechazar:** `provider_finalize_booking` bloquea la fila con `FOR UPDATE`, pero `reject` reembolsa antes de cambiar el estado y no toma ese bloqueo. Si el Partner finaliza mientras su propio rechazo está reembolsando, la reserva puede terminar COMPLETED con el reembolso hecho, o el cambio a CANCELLED falla con `STATE_UPDATE_FAILED`.
  - **Solución de N4 y M1 (bloque A siguiente):** RPCs con `FOR UPDATE` que comprueben reembolsos vivos y cambien el estado en la misma transacción (o un estado intermedio "reclamado" antes de llamar a Kushki).
  - **M4 · dos reembolsos simultáneos del mismo ticket:** si se rechazan/cancelan a la vez dos reservas distintas del mismo pedido, cada una ve la fila `PENDING` de la otra en la guardia H2 y ambas pueden terminar en `MANUAL_REQUIRED`. Nunca hay dos llamadas a Kushki ni pérdida de dinero; solo un reembolso manual de más (runbook §3).
  - **M2 y M3 · endurecimiento de `kushki-charge` (bloque 2, junto con su despliegue):** (a) registrar una fila `PENDING` antes de llamar a Kushki en `voidCharge` (hoy la fila se escribe después; si la función muere a mitad no queda rastro); (b) resolver la llave privada y el cliente admin **antes** de cobrar, para que un fallo de configuración no ocurra con el cobro ya hecho; (c) una respuesta de estado incierto explícita cuando el cobro fue aprobado pero no se pudo crear la reserva ni confirmar la anulación.
- **N8 · diferido:** el error de la RPC al aceptar (`provider-respond-booking`, rama `accept`) todavía se devuelve tal cual al cliente. Se cambiará a un mensaje genérico con `console.error` en un bloque posterior.
- **Resolución manual de reembolsos** (`PENDING`/`UNKNOWN`/`MANUAL_REQUIRED`/`CHARGE_VOID`): ver `docs/RUNBOOK_reembolsos.md`.
