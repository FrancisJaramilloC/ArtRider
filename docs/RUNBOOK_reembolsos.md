# RUNBOOK · Reembolsos y anulaciones (payment_refunds)

- **Para qué:** resolver a mano los reembolsos que el sistema no pudo cerrar solo (`PENDING`, `UNKNOWN`, `MANUAL_REQUIRED`) y revisar las anulaciones de cobro (`CHARGE_VOID`).
- **Contexto:** `docs/PLAN_pagos-reembolsos.md` y `docs/sql/2026-11-24_pagos_reembolsos.sql`. La tabla `public.payment_refunds` solo es accesible con service role (SQL Editor de Supabase).
- **Regla de oro:** primero se verifica en la consola de Kushki; **después** se toca la base. Nunca al revés. Las plantillas SQL de abajo son **solo texto**: se copian, se reemplazan los `<…>` y se ejecutan a mano con OK explícito.
- **Un statement por bloque:** el SQL Editor de Supabase solo muestra el resultado del ÚLTIMO statement. Cada bloque SQL de este runbook tiene un solo `SELECT` (o un solo `DO`); ejecutarlos de uno en uno.
- **Cómo funcionan las plantillas que modifican datos:** son un bloque `DO $$ … $$` que hace el `UPDATE` solo si la fila sigue en el estado esperado y lanza un error si no cambió **exactamente 1** fila. Un bloque `DO` es atómico: si lanza el error, no se guarda nada. No hay `COMMIT` manual que dependa de leer un resultado. El `SELECT` de verificación va aparte, después.
- **No pegar nunca** en chats, tickets ni capturas: el ticket completo de Kushki, llaves, ni datos de tarjeta. Para referirse a una transacción, usar los últimos 4 caracteres del ticket y el `id` de la fila.
- **Ante cualquier ambigüedad** (monto, fecha, cantidad de reembolsos): no cerrar la fila y escalar a Emilio.

---

## 0. Qué significa cada estado

| status | Qué pasó | ¿Bloquea otro reembolso automático de la reserva? | Acción |
|---|---|---|---|
| `PENDING` | Se registró el intento y la función no llegó a guardar el resultado (se cortó, o falló el `UPDATE` final). **Ojo:** si falló el `UPDATE` final, Kushki pudo haber reembolsado igual; la app recibió `REFUND_IN_PROGRESS` y la reserva NO se canceló. | Sí | §2: verificar en Kushki y cerrar. |
| `SUCCEEDED` | Kushki confirmó el reembolso. | Sí (para siempre) | Ninguna. |
| `FAILED` | Kushki lo rechazó con un 4xx explícito, o falló algo **antes** de llamar a Kushki. | No (se puede reintentar desde la app) | Revisar `kushki_message` si se repite. |
| `UNKNOWN` | Timeout, error de red o HTTP 408/5xx: **puede que Kushki sí lo haya hecho**. | Sí | §2: verificar en Kushki y cerrar. |
| `MANUAL_REQUIRED` | Guardia H2: el ticket compartido ya tiene un reembolso parcial; Kushki no admite otro. Normalmente la reserva quedó `CANCELLED` (decisión D3), **pero no siempre**: si falló el cambio de estado (`STATE_UPDATE_FAILED`), sigue en su estado anterior. Comprobar siempre `booking_status`. | Sí | §3: reembolsar a mano en Kushki. |

Mientras una reserva tenga una fila viva (`PENDING`, `SUCCEEDED`, `UNKNOWN`, `MANUAL_REQUIRED`): el Partner no puede aceptarla (409 `REFUND_IN_PROGRESS`) ni finalizarla (`provider_finalize_booking` lo bloquea).

**Quién puede reintentar desde la app** (cuando la reserva queda sin reembolso vivo):
- `AWAITING_SIGNATURES`: el Partner (rechazar) **y** el Rider (cancelar).
- `PAID` o `ACTIVE`: **solo el Partner** (cancelar). El Rider solo puede cancelar reservas en `AWAITING_SIGNATURES`.
- `CANCELLED` u otro: nadie. El Partner recibe `INVALID_STATE` y el Rider `alreadyCancelled`.

---

## 1. Verificar primero en la consola de Kushki

1. Entrar a la consola de Kushki del ambiente correcto:
   - **UAT (pruebas):** es el ambiente actual (`KUSHKI_BASE_URL = https://api-uat.kushkipagos.com` en `supabase/functions/_shared/refunds.ts`). Consola de pruebas de Kushki.
   - **Producción:** solo cuando `KUSHKI_BASE_URL` apunte a `https://api.kushkipagos.com`. Consola de producción. No mezclar: un ticket de UAT no existe en producción y viceversa.
2. Buscar la transacción **original del cobro** por número de ticket (el ticket completo se obtiene con la consulta 2.1, en el SQL Editor, sin copiarlo fuera).
3. Revisar en el detalle de esa transacción:
   - Estado del cobro (aprobado / anulado).
   - Lista de reembolsos/anulaciones asociados: monto, fecha/hora y estado (aprobado / rechazado).
4. **OBLIGATORIO antes de cerrar cualquier fila como `SUCCEEDED`:** ejecutar la consulta de **todas las filas del mismo ticket** (2.2) y comparar:
   - **A** = cantidad de reembolsos **aprobados** que muestra Kushki para ese ticket.
   - **B** = cantidad de filas `SUCCEEDED` de ese ticket en `payment_refunds`.
   - Solo se puede cerrar la fila como `SUCCEEDED` si **A > B**, es decir, si en Kushki existe un reembolso aprobado que **no** está ya asignado a otra fila `SUCCEEDED` del mismo ticket, y ese reembolso coincide en monto (`amount_cents / 100` USD) y fecha (cerca de `created_at`, en UTC; Ecuador = UTC−5) con la fila.
   - Si **A ≤ B**, ese reembolso ya está registrado en otra fila: **no** cerrar como `SUCCEEDED` (para esta fila, Kushki NO reembolsó).
   - Si por monto o fecha no se puede saber a qué fila corresponde cada reembolso: **no cerrar y escalar a Emilio.**
5. Conclusión (una sola). Para filas de reserva, seguir la tabla de decisión de §2.3.
   - **No está claro** → no tocar la base; dejar la fila como está y escalar a Emilio (y, si hace falta, a soporte de Kushki).

---

## 2. Filas `PENDING` / `UNKNOWN` de reservas (no `CHARGE_VOID`)

Las filas `CHARGE_VOID` se tratan en §4, no aquí.

**Espera mínima de 10 minutos**, medida desde `updated_at`, tanto para `PENDING` como para `UNKNOWN`: Kushki puede tardar en reflejar la operación en la consola, y una fila `PENDING` reciente puede estar aún en curso.

### 2.1 Listar las pendientes de resolver (solo lectura)

```sql
-- Solo lectura. Muestra el ticket completo SOLO dentro del SQL Editor para buscarlo en la consola de Kushki.
SELECT r.id, r.booking_id, r.order_id, r.kushki_ticket, right(r.kushki_ticket, 4) AS ticket_last4,
       r.amount_cents, r.reason, r.status, r.kushki_code, r.kushki_message,
       r.created_at, r.updated_at, b.status AS booking_status
FROM public.payment_refunds r
LEFT JOIN public.bookings b ON b.id = r.booking_id
WHERE r.status IN ('PENDING', 'UNKNOWN')
  AND r.reason <> 'CHARGE_VOID'
  AND r.updated_at < now() - interval '10 minutes'
ORDER BY r.created_at;
```

### 2.2 Todas las filas del mismo ticket (solo lectura, OBLIGATORIA antes de cerrar como `SUCCEEDED`)

```sql
-- Compara con Kushki: cantidad de reembolsos aprobados en la consola vs. filas SUCCEEDED aquí (ver §1, paso 4).
SELECT id, booking_id, right(kushki_ticket, 4) AS ticket_last4, amount_cents, reason, status, created_at, updated_at
FROM public.payment_refunds
WHERE kushki_ticket = (SELECT kushki_ticket FROM public.payment_refunds WHERE id = '<payment_refunds.id>')
ORDER BY created_at;
```

### 2.3 Tabla de decisión

| Kushki (§1) | `booking_status` | Qué hacer |
|---|---|---|
| Reembolso **aprobado** por ese monto, **no asignado** a otra fila `SUCCEEDED` del ticket (§1, paso 4) | cualquiera | Cerrar como `SUCCEEDED` (2.4). Si la reserva **no** está `CANCELLED`, el siguiente rechazo/cancelación desde la app devolverá `ALREADY_REFUNDED` y la cancelará sin volver a llamar a Kushki: avisar a quien pueda reintentar (ver §0, "Quién puede reintentar"), o cancelarla a mano con OK explícito. |
| **Sin** reembolso para esta fila | **`CANCELLED`** | **NO marcar `FAILED` ni pedir que se reintente desde la app**: es imposible (el Partner recibe `INVALID_STATE` y el Rider `alreadyCancelled`) y el Rider se quedaría sin su dinero. Hacer el reembolso **a mano** en la consola de Kushki por `amount_cents / 100` USD, confirmar que quedó aprobado, repetir la comparación de §1 paso 4 y cerrar como `SUCCEEDED` (2.4) indicando en el mensaje que fue manual. |
| **Sin** reembolso para esta fila | `AWAITING_SIGNATURES` | Cerrar como `FAILED` (2.5). Pueden reintentar el Partner (rechazar) y el Rider (cancelar). |
| **Sin** reembolso para esta fila | `PAID` o `ACTIVE` | Cerrar como `FAILED` (2.5). Solo el Partner puede reintentar (cancelar). |
| **Sin** reembolso para esta fila | otro (`COMPLETED`, etc.) | No tocar; escalar a Emilio (no debería ocurrir: finalizar está bloqueado con un reembolso vivo). |
| Ambiguo | cualquiera | No tocar; escalar a Emilio. |

### 2.4 Cerrar como `SUCCEEDED`

```sql
DO $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.payment_refunds
  SET status = 'SUCCEEDED',
      kushki_message = 'Verificado en consola Kushki <AAAA-MM-DD> por <iniciales>: reembolso <automático|manual> aprobado <monto> USD',
      updated_at = now()
  WHERE id = '<payment_refunds.id>'
    AND reason <> 'CHARGE_VOID'
    AND status IN ('PENDING', 'UNKNOWN');   -- no pisa una fila ya resuelta
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Se esperaba actualizar 1 fila y se actualizaron %. No se guardó nada.', v_rows;
  END IF;
END $$;
```

Verificación (aparte):

```sql
SELECT id, booking_id, right(kushki_ticket, 4) AS ticket_last4, amount_cents, reason, status, kushki_message, updated_at
FROM public.payment_refunds
WHERE id = '<payment_refunds.id>';
-- Esperado: 1 fila con status SUCCEEDED.
```

### 2.5 Cerrar como `FAILED` (solo si la reserva NO está `CANCELLED`)

```sql
DO $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.payment_refunds r
  SET status = 'FAILED',
      kushki_message = 'Verificado en consola Kushki <AAAA-MM-DD> por <iniciales>: sin reembolso para este monto',
      updated_at = now()
  WHERE r.id = '<payment_refunds.id>'
    AND r.reason <> 'CHARGE_VOID'
    AND r.status IN ('PENDING', 'UNKNOWN')
    -- Protección: nunca FAILED si la reserva ya está cancelada (nadie podría reintentar desde la app).
    AND EXISTS (SELECT 1 FROM public.bookings b
                WHERE b.id = r.booking_id
                  AND b.status::text IN ('AWAITING_SIGNATURES', 'PAID', 'ACTIVE'));
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Se esperaba actualizar 1 fila y se actualizaron %. No se guardó nada (¿fila ya resuelta o reserva CANCELLED?).', v_rows;
  END IF;
END $$;
```

Verificación 1 (aparte):

```sql
SELECT id, booking_id, status, kushki_message, updated_at
FROM public.payment_refunds
WHERE id = '<payment_refunds.id>';
-- Esperado: 1 fila con status FAILED.
```

Verificación 2 (aparte):

```sql
SELECT count(*) AS filas_vivas_de_la_reserva
FROM public.payment_refunds
WHERE booking_id = '<booking_id>'
  AND status IN ('PENDING', 'SUCCEEDED', 'UNKNOWN', 'MANUAL_REQUIRED');
-- Esperado: 0.
```

---

## 3. Filas `MANUAL_REQUIRED`

### 3.1 Listar (solo lectura)

```sql
SELECT r.id, r.booking_id, r.order_id, r.kushki_ticket, right(r.kushki_ticket, 4) AS ticket_last4,
       r.amount_cents, r.reason, r.status, r.kushki_message, r.created_at,
       b.status AS booking_status
FROM public.payment_refunds r
LEFT JOIN public.bookings b ON b.id = r.booking_id
WHERE r.status = 'MANUAL_REQUIRED'
  AND r.reason <> 'CHARGE_VOID'
ORDER BY r.created_at;
```

Revisar `booking_status`: si **no** es `CANCELLED`, falló el cambio de estado al rechazar/cancelar. La reserva sigue activa para la app hasta que alguien con permiso (§0) vuelva a rechazar/cancelar: con la fila ya `MANUAL_REQUIRED` o ya cerrada como `SUCCEEDED`, ese reintento cancela la reserva sin llamar a Kushki. Avisar a quien corresponda, o cancelarla a mano con OK explícito.

### 3.2 Todas las filas del mismo ticket (solo lectura, OBLIGATORIA)

Es la misma consulta de 2.2. Muestra el reembolso parcial que ya se hizo en el ticket y cualquier otra fila.

```sql
SELECT id, booking_id, right(kushki_ticket, 4) AS ticket_last4, amount_cents, reason, status, created_at, updated_at
FROM public.payment_refunds
WHERE kushki_ticket = (SELECT kushki_ticket FROM public.payment_refunds WHERE id = '<payment_refunds.id>')
ORDER BY created_at;
```

### 3.3 Procesar

1. En la consola de Kushki, sobre el cobro original del ticket, hacer el reembolso/devolución por `amount_cents / 100` USD (o la vía que indique soporte de Kushki si la consola no admite un 2.º parcial).
2. Confirmar en la consola que quedó aprobado.
3. Repetir la comparación de §1 paso 4 con la consulta 3.2: tiene que haber un reembolso aprobado en Kushki que no esté ya asignado a otra fila `SUCCEEDED`. Si hay ambigüedad, no cerrar y escalar a Emilio.
4. Registrar el resultado:

```sql
DO $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.payment_refunds
  SET status = 'SUCCEEDED',
      kushki_message = 'Reembolso manual en consola Kushki <AAAA-MM-DD> por <iniciales>: <monto> USD aprobado',
      updated_at = now()
  WHERE id = '<payment_refunds.id>'
    AND reason <> 'CHARGE_VOID'
    AND status = 'MANUAL_REQUIRED';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Se esperaba actualizar 1 fila y se actualizaron %. No se guardó nada.', v_rows;
  END IF;
END $$;
```

Verificación (aparte):

```sql
SELECT id, booking_id, right(kushki_ticket, 4) AS ticket_last4, amount_cents, status, kushki_message, updated_at
FROM public.payment_refunds
WHERE id = '<payment_refunds.id>';
-- Esperado: 1 fila con status SUCCEEDED.
```

No pasar una fila `MANUAL_REQUIRED` a `FAILED`: Kushki rechazaría el 2.º reembolso parcial del ticket, y si la reserva ya está `CANCELLED` nadie podría reintentar desde la app. Comprobar `booking_status` (3.1) antes de dar el caso por cerrado.

---

## 4. Filas `CHARGE_VOID` (anulación de un cobro cuya reserva no se pudo crear)

> **Activo solo desde el despliegue de `kushki-charge` en el bloque 2.** Hasta entonces la versión desplegada de `kushki-charge` no escribe en `payment_refunds` y esta sección no aplica.

Las crea `kushki-charge` (sin `booking_id`). No bloquean nada en la app; se revisan para asegurarse de que el Rider no quedó cobrado sin reserva. Aplica la misma espera de 10 minutos desde `updated_at` y la misma comparación de §1 paso 4 antes de cerrar como `SUCCEEDED`.

### 4.1 Listar (solo lectura)

```sql
SELECT id, kushki_ticket, right(kushki_ticket, 4) AS ticket_last4, amount_cents, status, kushki_message, created_at, updated_at
FROM public.payment_refunds
WHERE reason = 'CHARGE_VOID'
  AND status IN ('PENDING', 'FAILED', 'UNKNOWN')   -- SUCCEEDED no requiere acción; MANUAL_REQUIRED va en §4.3
  AND updated_at < now() - interval '10 minutes'
ORDER BY created_at;
```

`PENDING` con `kushki_message = 'ANULACION_EN_CURSO'` y más de 10 minutos: la función escribió la fila antes de llamar a Kushki (M2), pero murió o no pudo cerrarla. Se trata igual que `UNKNOWN`.

El Rider ve el mensaje "…Referencia: …XXXX" con los últimos 4 caracteres del ticket: buscar por `ticket_last4`.

### 4.2 Procesar

- `UNKNOWN` o `PENDING`: verificar en la consola (§1). Si ya está anulado → `SUCCEEDED`. Si no → anularlo/reembolsarlo en la consola y luego `SUCCEEDED`.
- `FAILED`: Kushki rechazó la anulación; anular/reembolsar a mano en la consola y luego `SUCCEEDED`. Si no se puede, escalar a Emilio y a soporte de Kushki.
- En todos los casos, avisar al Rider.

```sql
DO $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.payment_refunds
  SET status = 'SUCCEEDED',
      kushki_message = 'Anulación verificada/hecha en consola Kushki <AAAA-MM-DD> por <iniciales>',
      updated_at = now()
  WHERE id = '<payment_refunds.id>'
    AND reason = 'CHARGE_VOID'
    AND status IN ('PENDING', 'FAILED', 'UNKNOWN');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Se esperaba actualizar 1 fila y se actualizaron %. No se guardó nada.', v_rows;
  END IF;
END $$;
```

Verificación (aparte):

```sql
SELECT id, right(kushki_ticket, 4) AS ticket_last4, amount_cents, reason, status, kushki_message, updated_at
FROM public.payment_refunds
WHERE id = '<payment_refunds.id>';
-- Esperado: 1 fila con status SUCCEEDED.
```

### 4.3 `CHARGE_VOID` en `MANUAL_REQUIRED` (cobro aprobado que el sistema NO anuló a propósito)

`kushki-charge` no anula a ciegas cuando no sabe si la reserva existe. Deja una fila `MANUAL_REQUIRED` con uno de estos prefijos fijos en `kushki_message`:

| Prefijo | Qué pasó |
|---|---|
| `COBRO_SIN_CONFIRMAR` | Kushki devolvió ticket pero sin `transactionStatus` (o 408/5xx con ticket). |
| `RPC_SIN_RESPUESTA` | Cobro aprobado y la creación de la reserva no respondió (timeout/red) o no se pudo buscar la reserva. |
| `ERROR_TRAS_COBRO` | Error inesperado de la función después de recibir el ticket. |

```sql
SELECT id, right(kushki_ticket, 4) AS ticket_last4, amount_cents, left(kushki_message, 20) AS prefijo, created_at
FROM public.payment_refunds
WHERE reason = 'CHARGE_VOID' AND status = 'MANUAL_REQUIRED'
ORDER BY created_at;
```

Para cada fila:
1. Buscar la reserva con ese ticket: `SELECT id, status FROM public.bookings WHERE kushki_ticket = (SELECT kushki_ticket FROM public.payment_refunds WHERE id = '<payment_refunds.id>');`.
2. **Si la reserva existe:** el cobro es correcto. **No anular.** Cerrar la fila con `SUCCEEDED` y un `kushki_message` del tipo "Reserva <id> existe; cobro válido, no se anula" (misma plantilla `DO $$` de §4.2, cambiando `status IN (...)` por `status = 'MANUAL_REQUIRED'`).
3. **Si no existe:** verificar el cobro en la consola de Kushki (§1). Si está aprobado, anularlo/reembolsarlo allí, avisar al Rider y cerrar como `SUCCEEDED`. Si Kushki dice que no hubo cobro, cerrar como `FAILED` con ese motivo.

---

## 5. Cobros sin confirmar (`CHARGE_UNKNOWN`)

> **Activo solo desde el despliegue de `kushki-charge` en el bloque 2.** La versión desplegada hoy no devuelve `CHARGE_UNKNOWN` ni escribe el log `COBRO SIN CONFIRMAR`.

Si Kushki devolvió ticket, hay fila `MANUAL_REQUIRED` (§4.3). Los casos **sin ticket** (timeout o red al cobrar, cuerpo ilegible, sin ticket) no dejan fila en `payment_refunds`. Se detectan en los logs de la Edge Function `kushki-charge` con el texto `COBRO SIN CONFIRMAR` (incluye `clientId`, motivo, tipo, ids de listing/paquete y total en centavos). Buscar en la consola de Kushki un cobro de ese monto a esa hora; si existe y el Rider no tiene reserva, reembolsarlo en la consola y avisar al Rider. Si no se puede identificar el cobro con certeza, escalar a Emilio.
