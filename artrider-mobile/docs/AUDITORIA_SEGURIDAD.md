# Auditoría de seguridad — Supabase ArtRider (`rgjsjesjvxcybprtmhrc`)

Fecha: 2026-11-19 · Alcance: SOLO LECTURA. No se aplicó ningún cambio (ni SQL de escritura, migraciones, políticas, funciones ni storage).
Todos los arreglos están **propuestos, sin aplicar**. Las consultas citadas se pueden volver a ejecutar para verificar.

## Resumen

| Gravedad | Hallazgos |
|---|---|
| Crítico | 2 |
| Alto | 3 |
| Medio | 7 |
| Bajo | 4 |

---

## CRÍTICO

### C1. Cualquier usuario autenticado puede crear reservas/pedidos sin pagar
**Dato:** `create_booking`, `create_package_booking` y `create_cart_order` son `SECURITY DEFINER` con `EXECUTE` para `authenticated` (anon y PUBLIC no). Reciben `p_kushki_ticket text` como texto libre y **nunca lo verifican** contra Kushki; el precio lo calcula la BD, pero el cobro solo ocurre en la Edge Function. Llamando `POST /rest/v1/rpc/create_booking` con el JWT propio y `p_kushki_ticket = 'x'` se crea la reserva en `AWAITING_SIGNATURES`, bloquea unidades del Partner y queda lista para que el Partner la acepte sin que haya habido cobro.

Consulta: 
```sql
select p.proname, has_function_privilege('authenticated', p.oid,'EXECUTE')
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('create_booking','create_package_booking','create_cart_order');
```
(Ver también el cuerpo: `pg_get_functiondef` — no hay verificación del ticket.)

**Arreglo propuesto:**
1. Cambiar las tres funciones (y `_insert_*`, ya sin EXECUTE) para recibir `p_user uuid` en lugar de usar `auth.uid()`, y dejar `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`.
2. En `kushki-charge`, tras validar al usuario con `getUser()`, llamar a los RPC con un cliente `service_role` pasando `userData.user.id`. Hoy los llama con el JWT del usuario, así que revocar sin este cambio rompe el pago.
3. Opcional: guardar `kushki_ticket` con restricción única parcial para impedir reutilizar un ticket en otra reserva (excepto líneas del mismo `order_id`).

### C2. `bookings` se puede insertar y actualizar directamente desde el cliente
**Dato (políticas):**
- `bookings_insert` → `WITH CHECK (auth.uid() = client_id)`. No restringe `status`, `provider_id`, `total_price`, `kushki_ticket`. Un Rider puede insertar una reserva directa con `status='PAID'/'ACTIVE'/'COMPLETED'`, cualquier precio (incluso 0) y cualquier `provider_id`. El trigger `prevent_booking_pricing_mutation` es solo `BEFORE UPDATE`, no cubre INSERT.
- `bookings_update` → `USING/WITH CHECK ((auth.uid()=client_id) OR is_my_provider(provider_id))`. El Rider puede poner cualquier `status` (p. ej. `CANCELLED` sin reembolso, `COMPLETED` para poder reseñar o forzar liquidación) y el Partner cualquier estado saltándose `provider-respond-booking`/reembolsos. `prevent_booking_identity_mutation` existe pero **no está enganchado como trigger** (la lista de triggers de `bookings` solo muestra snapshot, pricing y snapshot_mutation).
- Los grants de tabla dan INSERT/UPDATE/DELETE a `authenticated` (ver A2), así que RLS es la única barrera.

Esto ya está reconocido en el código (`client-cancel-booking` cita `docs/PROPUESTA_BOOKINGS_SOLO_SERVIDOR.sql`), pero **sigue sin aplicarse**.

**Arreglo propuesto:**
- `DROP POLICY bookings_insert; DROP POLICY bookings_update;` (los INSERT/UPDATE pasan solo por RPC/Edge con service_role).
- `REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM anon, authenticated;`
- Si hace falta UPDATE de Partner, hacerlo vía `provider_set_booking_status` (ya existe, SECURITY DEFINER).
- Antes de aplicar, confirmar que la app móvil no hace `.from('bookings').update/insert` (en especial `cancelBooking`, ya migrada a `client-cancel-booking`).

---

## ALTO

### A1. Funciones `SECURITY DEFINER` ejecutables por `anon`/PUBLIC (advisor `anon_security_definer_function_executable`, 14)
**Dato:** con EXECUTE para anon: `get_available_units_count`, `get_client_bookings`*, `get_listing_ratings`*, `get_listing_reviews`, `get_listing_total_units`, `get_my_conversations`*, `get_package_reviews`, `get_package_unavailable_dates`, `get_pricing_settings`*, `get_provider_public_profile`*, `get_unavailable_dates`*, `handle_new_user`*, `is_my_provider`, `mark_messages_read`*. (`*` = además concedido a **PUBLIC**, por lo que revocar solo a `anon` no basta.)
Las que usan `auth.uid()` devuelven vacío/excepción sin sesión, pero `handle_new_user` (función de trigger) y `is_my_provider` no deben ser públicas, y `get_listing_reviews`/`get_package_reviews` (SECURITY DEFINER con `search_path=""`) deberían revisarse por si exponen datos de autores.
**Consulta:** la del punto 3 (`has_function_privilege`, `aclexplode(proacl)`).
**Arreglo:** `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon;` para todas las de lectura propia/escritura (`get_client_bookings`, `get_my_conversations`, `mark_messages_read`, `handle_new_user`, `is_my_provider`) y mantener solo las realmente públicas (catálogo, fechas no disponibles, rating, precios). Para las que se mantienen públicas, valorar `SECURITY INVOKER` + política de lectura.

### A2. `anon` y `authenticated` tienen TODOS los privilegios en TODAS las tablas de `public`
**Dato:** `information_schema.role_table_grants` muestra `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` para ambos roles en las 35 tablas (solo `pricing_settings` está acotada a SELECT). Todo el modelo depende de que **nunca falte o se afloje una política RLS** (como ocurre en C2). `TRUNCATE` no está sujeto a RLS (PostgREST no lo expone, pero sí cualquier conexión directa con esos roles).
**Arreglo:** `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;` y luego `GRANT` mínimos por tabla (SELECT en catálogos/listings/packages/providers; INSERT/UPDATE/DELETE solo donde exista flujo directo y política). Aplicar también `ALTER DEFAULT PRIVILEGES` para tablas futuras.

### A3. `upload-listing-cover`: `verify_jwt=false`, valida usuario pero sube con `service_role` sin validar contenido
**Dato (código v1):** sí hace `auth.getUser()` y exige fila en `providers`, pero: (a) no comprueba `provider.status` (se selecciona y no se usa → Partners no aprobados/suspendidos suben); (b) `mimeType` y la extensión vienen del cliente sin lista blanca → se puede subir `text/html`, `image/svg+xml` u otros a un bucket **público** (`listing-covers`, `allowed_mime_types = null`); (c) el límite de 5 MB se aplica después de decodificar todo el base64 en memoria (DoS/consumo); (d) CORS `*`.
**Arreglo:** lista blanca `image/jpeg|png|webp`, derivar extensión de esa lista, comprobar `status='APPROVED'` (o el valor que corresponda), rechazar por `content-length` antes de decodificar, y fijar `allowed_mime_types` y `file_size_limit` en el bucket. Valorar activar `verify_jwt=true` (la app ya envía el JWT) y mantener `getUser()`.

---

## MEDIO

### M1. Edge Functions con `verify_jwt=false`
| Función | verify_jwt | Valida usuario dentro | Observaciones |
|---|---|---|---|
| `kushki-charge` | false | Sí (`auth.getUser()` con el header) | Precio solo desde BD ✔. Sin límite de intentos: cualquier usuario registrado puede usarla como oráculo de *card testing* contra Kushki. CORS `*`. `REQUIRE_EXPECTED_TOTAL` desactivado por defecto. Datos de contacto fijos de prueba (`test@artrider.com`, `1700000000`) y URL UAT. Sin idempotencia (doble toque = doble cobro). |
| `upload-listing-cover` | false | Sí | Ver A3. |
| `client-cancel-booking` | false | Sí; lee la reserva con RLS y comprueba `client_id` | Carrera: dos llamadas simultáneas pasan el chequeo de estado y ambas intentan reembolsar antes del UPDATE condicional (Kushki probablemente rechaza el 2.º, pero no está garantizado). Mitigar marcando primero un estado intermedio o con bloqueo. |
| `provider-respond-booking` | **true** | Sí, vía RPC `get_booking_for_provider_action` | Reembolso con `total_price / 100` sin redondeo (flotante) y sin protección contra doble ejecución. |

**Arreglo:** `verify_jwt=true` en las tres con auth por usuario (la app móvil ya envía el JWT; `getUser()` interno se mantiene), rate limiting por usuario en `kushki-charge`, idempotency key, CORS restringido (las apps nativas no lo necesitan).

### M2. `reviews`: INSERT directo sin restricciones de `target_id`/unicidad
**Dato:** la política `Only booking participants can create reviews` comprueba `author_id=auth.uid()` y reserva `COMPLETED`, pero no limita `target_id`, `rating` ni evita varias reseñas por reserva; además compara `auth.uid() = bookings.provider_id` y `provider_id` es `providers.id` (no `user_id`) → la rama del Partner nunca coincide (bug funcional). Combinado con C2 (estado `COMPLETED` forjable) permite reseñas falsas.
**Arreglo:** quitar INSERT directo (usar solo `submit_review`) y añadir `UNIQUE (booking_id, author_id)`.

### M3. `bookings`/`conversations`/`digital_contracts` UPDATE sin columnas acotadas
`conversations_update` no tiene `WITH CHECK` (permite cambiar `client_id`/`provider_id` de una conversación propia). `digital_contracts` permite a cualquiera de las dos partes actualizar cualquier columna (el trigger `prevent_contract_cross_signature` no aparece enganchado en la lista de triggers). **Arreglo:** `WITH CHECK` explícito y triggers/RPC para firmas.

### M4. Políticas duplicadas y solapadas en `listings`
Hay dos juegos (`Owners can ...` con `auth.uid()=provider_id` y `listings_*` con `is_my_provider`). `Anyone can read published listings` no filtra `deleted_at`, aunque `listings_read` sí; al ser permisivas se suman → **listados borrados lógicamente siguen visibles** si `is_published=true`. Mismo patrón en `packages` (`packages_read` sin `deleted_at` + `packages_owner_read`). **Arreglo:** eliminar las políticas redundantes y dejar una sola por comando con `deleted_at IS NULL`.

### M5. Storage
- `avatars` (público, 1 MB, mime restringido ✔): políticas correctas, pero duplicadas (`_own` por prefijo `uid-%` y `_own_folder` por carpeta); sin política SELECT (el bucket público la hace innecesaria). Unificar.
- `listing-covers` (público, 5 MB, **sin mime**): INSERT/UPDATE con rol `public` y `is_my_provider(substring(name,1,36)::uuid)`; un nombre de objeto que no empiece con UUID provoca error de cast (rechaza, pero conviene validarlo sin excepción). Sin DELETE → los covers antiguos se acumulan. Fijar `allowed_mime_types`.
- `riders` (privado, sin políticas): solo accesible vía service_role. Correcto, pero **no pude comprobar su uso** (ver «No revisado»).

### M6. Protección contra contraseñas filtradas desactivada (advisor `auth_leaked_password_protection`)
**Arreglo:** Dashboard → Auth → Providers/Password security → activar *Leaked password protection*. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### M7. `providers_public_read` (`USING true`) para el rol public
Expone a anon toda la tabla `providers` (`id, user_id, brand_name, bio, status, created_at`). Hoy no hay columnas sensibles, pero revela `user_id` (UUID de auth) y el estado de aprobación de todos los Partners. **Arreglo:** limitar a Partners aprobados o exponer una vista/RPC (`get_provider_public_profile` ya existe) y quitar el SELECT directo a anon.

---

## BAJO

- **L1. `debug_check_provider(uuid)`** — función de depuración expuesta a anon/PUBLIC (permite sondear `is_my_provider`). `DROP FUNCTION`.
- **L2. `function_search_path_mutable` (6):** `touch_pricing_settings`, `ceil_with_rate`, `rider_daily_price`, `round_to_99`, `cart_total`, `prevent_booking_pricing_mutation`. Añadir `SET search_path = ''` (o `public`). https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- **L3. `advisory_expert_corrections` y `advisory_training_data`:** RLS activado sin políticas (INFO). Comportamiento correcto (solo service_role) pero con grants totales a anon/authenticated (ver A2). Documentar la intención.
- **L4. Roles en políticas:** casi todas usan `{public}` en vez de `{authenticated}`. Funcionan por `auth.uid()`, pero es más seguro restringir al rol.

---

## Respuestas a lo pedido

1. **Advisors:** 1 INFO (RLS sin políticas ×2), 4 WARN (search_path mutable ×6, anon DEFINER ×14, authenticated DEFINER ×31, contraseñas filtradas). Los 31 «authenticated DEFINER» son en su mayoría intencionales (RPC de la app); los peligrosos son los de C1.
2. **RLS:** las 35 tablas de `public` tienen RLS activo; ninguna sin RLS. Las abiertas/débiles son `bookings` (INSERT/UPDATE, C2), `reviews` (M2), `conversations`/`digital_contracts` (M3), `listings`/`packages` (M4) y `providers` SELECT (M7). `orders`, `cart_items`, `profiles`, `messages`, `pricing_settings`, `payments` están bien acotadas por políticas (aunque `profiles` y `payments` heredan el problema de grants, A2). `orders` y `checkout_orders` solo tienen SELECT propio ✔.
3. **SECURITY DEFINER:** ver C1 y A1. `create_*` solo `authenticated`; `_cart_lines`, `_insert_*`, `_pricing_rates`, `create_multi_provider_checkout` sin EXECUTE para clientes ✔.
4. **Storage:** ver M5.
5. **Edge Functions:** ver M1/A3.

## Orden sugerido de aplicación
1. C1 (RPC → service_role + ajustar `kushki-charge`) y C2 (bookings solo servidor), **juntos** y probando el flujo de pago/cancelación en UAT.
2. A1 y A2 (revocar EXECUTE/grants), comprobando que la app no depende de ellos.
3. A3, M1–M7, L1–L4.

## No pude revisar
- **Cuerpos de las RPC de lectura** (`get_listing_reviews`, `get_provider_public_profile`, `get_my_conversations`, etc.) para confirmar qué datos devuelven a anon: solo revisé permisos y los cuerpos de `create_*`, `_insert_listing_booking`, `get_client_bookings`, `mark_messages_read`, `handle_new_user`.
- **`_insert_package_booking`** y los triggers `prevent_snapshot_mutation`/`populate_*` (no leí su código).
- **Uso del bucket `riders`** y de `checkout_orders`/`create_multi_provider_checkout` desde la app (no auditado el código móvil).
- **Configuración de Auth** (confirmación de email, rate limits, proveedores OAuth, URL de redirección) y **secretos** de Edge Functions: el plugin no los expone; no se leyó ningún `.env`.
- **Explotabilidad real:** C1 y C2 se deducen de políticas, grants y código; no se probaron con llamadas reales porque la auditoría es de solo lectura.
- **Columnas sensibles de `profiles`** (el SELECT es solo propio, así que no se expone a otros; no revisé columnas).
- **Network/PITR/backups, logs de acceso y advisors de rendimiento:** fuera de alcance.
