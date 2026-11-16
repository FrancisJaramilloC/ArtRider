# Base de datos (Supabase) — referencia para la app móvil

> Fuente: `art-rider/supabase/{schema.sql,rls.sql,migrations/*}` y `supabase/{config.toml,functions/*}`.
> **No se consultó la base en vivo** (sin MCP de Supabase conectado, solo lectura del repo). Lo que la app usa pero el repo no define está marcado como **«no definido en el repo»**: puede existir en la base real, pero no se puede auditar desde aquí.
> Importes en **centavos** (`daily_price`, `total_price`: enteros). La UI divide entre 100.

## 1. Enums

| Enum | Valores |
|---|---|
| `booking_status` | `AWAITING_SIGNATURES`, `PAID`, `ACTIVE`, `COMPLETED`, `DISPUTE`, `CANCELLED`, `ARCHIVED` (añadido en `20260509`) |
| `payment_status` | `AUTHORIZED`, `CAPTURED`, `REFUNDED` |
| `contract_status` | `PENDING`, `PARTIALLY_SIGNED`, `EXECUTED` |
| `calendar_status` | `BOOKED`, `BLOCKED`, `MAINTENANCE` |
| `verification_status` | `pending`, `verified`, `rejected` |
| `provider_status` | `pending`, `active`, `suspended` |
| `equipment_status` | `AVAILABLE`, `MAINTENANCE`, `RETIRED`, `LOST` |

`listings.category` es `TEXT` con CHECK (`audio, lighting, video, effects, other`); la migración `20260516_add_advertising_category` añade `advertising`.

## 2. Tablas (estado según el repo)

| Tabla | Columnas principales | Relaciones / notas |
|---|---|---|
| `profiles` | `id` (= auth.users.id), `email`, `full_name`, `birth_date`, `phone`, `avatar_url`, `avatar_updated_at`, `stripe_customer_id`, `deleted_at` | Se crea por trigger `on_auth_user_created` (`handle_new_auth_user`). |
| `identity_verifications` | `user_id` (único), `provider_ref`, `status`, `verified_at` | KYC (Stripe Identity en la web). |
| `providers` | `id`, `user_id` (único), `brand_name`, `bio`, `status`, `created_at` | Trigger impide que el usuario cambie su propio `status`. |
| `addresses` | `id`, `user_id`, `line1`, `line2`, `city`, `state`, `postal_code`, `country`, `latitude`, `longitude`, `deleted_at` | Dirección del anuncio. |
| `product_catalog` | `name`, `description`, `brand`, `model`, `category` | Catálogo maestro. |
| `listings` | `id`, `provider_id`, `catalog_item_id`, `address_id`, `title`, `brand`, `model`, `category`, `cover_image_url`, `gallery_images TEXT[]`, `daily_price`, `description`, `is_published`, `deleted_at` | Soft delete. La web además usa `specs` (**no definido en el repo**). |
| `equipment_units` | `listing_id`, `serial_number`, `condition`, `internal_status` | Unidades físicas; la cantidad de un anuncio = nº de unidades. |
| `packages` | `id`, `owner_id`, `provider_id`, `title`, `description`, `daily_price`, `cover_image_url`, `gallery_images`, `address_id`, `is_published`, `deleted_at` | Combos de equipos. |
| `package_items` | `package_id`, `listing_id`, `quantity` | |
| `bookings` | `id`, `client_id`, `provider_id`, `status`, `start_date`, `end_date`, `total_price`, `snapshot_listing/address/provider` (JSONB), `archived_at`, `checkout_order_id` | Triggers: snapshots inmutables, identidad inmutable. |
| `booking_units` | `booking_id`, `equipment_unit_id`, `locked_daily_price` | |
| `availability_calendar` | `equipment_unit_id`, `start_date`, `end_date`, `status`, `booking_id` | `EXCLUDE USING gist` evita solapes por unidad. |
| `payments` | `booking_id`, `stripe_payment_intent_id`, `amount`, `status`, `security_deposit_amount`, `created_at` | Solo lectura para usuarios (RLS). |
| `digital_contracts` | `booking_id`, `status`, `contract_hash`, `snapshot_booking`, firmas/PDF de dueño y cliente | |
| `conversations` | `id`, `booking_id` (opcional), `client_id`, `provider_id`, `listing_id` | |
| `messages` | `conversation_id`, `sender_id`, `content`, `sent_at` | La app móvil además lee/escribe `read` (**no definido en el repo**). |
| `conversation_archived`, `conversation_deleted` | por usuario y conversación | «Archivar» y «borrar para mí». |
| `reviews` | autor, booking, calificación, comentario | Solo participantes de reservas `COMPLETED`. |
| `checkout_orders` | orden de pago multi-proveedor (`client_id`, ticket de Kushki, totales, `status`, `refund_*`) | Tabla nueva de `20260804`. |
| `catalog_items` (vista) | unión de `listings` y `packages` (`item_type`) | Usada por búsqueda. |

**Usadas por la app pero no definidas en el repo:** `cart_items` (`added_at`…), `favorites` (`usuario_id`, `item_id`, `tipo`), `notifications`, y las tablas de asesoría de la web (`advisory_*`, `riders`, `event_types`…).

## 3. Funciones / RPC

**Definidas en el repo:** `is_my_provider(uuid)`, `create_multi_provider_checkout(...)` (web), `handle_new_auth_user()`, y triggers `prevent_booking_identity_mutation`, `prevent_contract_cross_signature`, `prevent_provider_status_self_change`, `populate_booking_snapshots`, `populate_booking_listing_snapshot`, `prevent_snapshot_mutation`.

**Usadas por la app móvil y NO definidas en el repo (19):**
`create_booking`, `create_package_booking`, `create_cart_order`, `get_cart_total`*, `get_client_bookings`, `get_provider_bookings`, `provider_finalize_booking`, `provider_set_booking_status`*, `get_booking_for_provider_action`*, `get_provider_listing_calendar`, `provider_toggle_block_date`, `get_unavailable_dates`, `get_package_unavailable_dates`, `get_listing_total_units`, `get_available_units_count`, `submit_review`, `get_listing_ratings`, `get_listing_reviews`, `get_package_reviews`, `get_my_conversations`, `mark_messages_read`, `get_or_create_conversation`.
(*) solo desde edge functions. Toda la lógica de reservas/pagos vive en funciones que solo existen en la base real: **no auditables desde el repo** (¿`SECURITY DEFINER`? ¿validan `auth.uid()`?).

## 4. Políticas RLS (estado final según migraciones)

| Tabla | Política relevante |
|---|---|
| `profiles` | SELECT solo propio (`auth.uid() = id`); INSERT/DELETE denegados; UPDATE propio «seguro». |
| `providers` | **SELECT `USING (true)`** (público, incluye `pending`/`suspended` y `user_id`); INSERT/UPDATE solo propietario; DELETE denegado. |
| `listings` | SELECT si `(is_published OR is_my_provider) AND deleted_at IS NULL`; escritura solo proveedor dueño. |
| `packages` / `package_items` | SELECT si publicado o dueño (`package_items` además filtra `deleted_at`); `packages_read` (consolidación) **no filtra `deleted_at`** (lo hace solo la política antigua de `20260511_soft_deletes`, ya reemplazada). |
| `equipment_units` | Proveedor lee/escribe; cliente lee las de sus reservas. |
| `bookings` / `booking_units` | Lectura cliente o proveedor; INSERT solo `auth.uid() = client_id`; DELETE denegado. |
| `availability_calendar` | **SELECT a todo `authenticated` (`USING (true)`)**; escritura solo proveedor. |
| `payments`, `digital_contracts` | Lectura cliente/proveedor vía `bookings`; payments sin escritura. |
| `conversations`, `messages` | Solo si hay `booking_id` y participas en esa reserva. **No cubre conversaciones sin reserva** (la migración `decouple_messaging` las permite). |
| `addresses` | Propia, o de un anuncio publicado y no borrado (lectura pública de la dirección). |
| `product_catalog` | SELECT `anon` y `authenticated` abierto; escritura denegada. |
| `reviews` | INSERT solo participantes de reserva `COMPLETED`; referencia `bookings.owner_id` (columna inexistente en `bookings`). |
| `checkout_orders` | SELECT solo `client_id`. |
| `conversation_archived/deleted` | SELECT/INSERT/DELETE propios. |
| `cart_items`, `favorites`, `notifications` | **Sin definición en el repo**: no se puede verificar RLS. |

Storage: buckets `avatars` (subida directa desde el móvil, `profileService.ts`) y `listing-covers` (subida solo vía edge function). **No hay SQL de buckets ni de sus políticas en el repo.**

## 5. Edge functions

| Función | JWT | Qué hace | Toca |
|---|---|---|---|
| `kushki-charge` | `verify_jwt = false` (solo comprueba que exista el header `Authorization`) | Calcula el total en servidor, cobra en Kushki (UAT) y llama a `create_booking`/`create_package_booking`/`create_cart_order`; si la RPC falla anula el cobro. | RPC anteriores, `get_cart_total`, `packages`, `listings` |
| `provider-respond-booking` | por defecto (verifica JWT) | Acepta o rechaza una reserva; si rechaza con cobro, reembolsa en Kushki. | RPC `get_booking_for_provider_action`, `provider_set_booking_status` |
| `upload-listing-cover` | `verify_jwt = false` (valida con `auth.getUser()`) | Sube la portada con service role al bucket `listing-covers` (máx. 5 MB, solo proveedores). | `providers`, Storage |

## 6. Mapeo pantalla → datos

| Pantalla / ruta | Servicio | Tablas / RPC / funciones |
|---|---|---|
| Home `(tabs)/index` | `homeService`, `exploreService`, `favoritosService` | `listings`(+`addresses`), `packages`, RPC `get_listing_ratings`, `favorites` |
| Búsqueda / `map` | `catalogService`, `exploreService` | `listings`, `catalog_items` |
| `listing/[id]` | `catalogService`, `availabilityService` | `listings`(+`providers`,`addresses`), RPC `get_listing_reviews`, `get_unavailable_dates`, `get_listing_total_units` |
| `package/[id]` | `packagesService`, `availabilityService` | `packages`+`package_items`+`listings`, RPC `get_package_reviews`, `get_package_unavailable_dates` |
| `cart`, `checkout/cart-summary` | `cartService` | `cart_items`, RPC `create_cart_order`, edge `kushki-charge` |
| `checkout/[id]`, `checkout/summary/[id]`, `checkout/package/*` | `bookingsService`, `availabilityService` | RPC `get_available_units_count`, `create_booking`, `create_package_booking`, edge `kushki-charge` |
| `checkout/success/[id]` | `bookingsService` | `bookings` |
| `(tabs)/reservations` | `bookingsService` | RPC `get_client_bookings`, `submit_review` |
| `(tabs)/messages`, `chat/[id]` | `messagesService` | RPC `get_my_conversations`, `mark_messages_read`, `get_or_create_conversation`; `messages`, `conversations`, `conversation_archived/deleted`; canales Realtime |
| `(tabs)/profile`, `profile/edit` | `profileService`, `AuthContext` | `profiles`, Storage `avatars` |
| `(auth)/*`, `reset-password` | `authService` | Supabase Auth |
| `become-provider`, `provider/settings` | `providerService` | `providers` |
| `(provider)/today`, `calendar` | `providerService` | RPC `get_provider_bookings`, `provider_finalize_booking`, `get_provider_listing_calendar`, `provider_toggle_block_date`, edge `provider-respond-booking` |
| `(provider)/listings`, `provider/create-*`, `edit-*` | `providerCatalogService` | `listings`, `addresses`, `equipment_units`, `packages`, `package_items`, edge `upload-listing-cover` |
| `provider/reviews` | `catalogService` | RPC de reseñas |

## 7. Verificación cruzada (solo reporte)

1. **19 RPC y 5 tablas sin definición en el repo** (ver §2 y §3). Las migraciones no reflejan la base real.
2. `messages.read`, `listings.specs`, `cart_items`, `favorites`, `notifications` usados por código pero ausentes del SQL.
3. RLS de `conversations`/`messages` exige `booking_id`, incompatible con las conversaciones sin reserva que crea `get_or_create_conversation`.
4. `reviews` referencia `bookings.owner_id`, que no existe en `bookings`.
5. `providers` y `availability_calendar` demasiado abiertas (§4).
6. `packages_read` sin filtro `deleted_at`.
7. `art-rider/types/database.types.ts` es un placeholder vacío (`Database = {}`): el móvil no tiene tipos generados y usa casts (`as`/`any`).
8. Tablas sin uso en el móvil: `payments`, `digital_contracts`, `identity_verifications`, `checkout_orders`, `product_catalog`.
