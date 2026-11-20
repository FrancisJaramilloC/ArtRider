-- APLICADO en producción el 2026-11-20.
-- PROPUESTA — NO APLICADA. PASO 2 de C1 (docs/AUDITORIA_SEGURIDAD.md).
--
-- APLICAR SOLO DESPUÉS de:
--   1. haber aplicado docs/PROPUESTA_C1_CREACION_SOLO_SERVIDOR.sql,
--   2. haber desplegado la Edge Function `kushki-charge` que usa las funciones *_for,
--   3. haber probado en el iPhone un pago de equipo, de paquete y de carrito con las funciones nuevas.
-- Si se aplica antes de (2), el pago deja de crear reservas: kushki-charge (versión actual) llama a las funciones viejas con el JWT del usuario.
--
-- Qué hace: quita EXECUTE a `authenticated`, `anon` y PUBLIC de create_booking / create_package_booking / create_cart_order (las firmas
-- vigentes en producción). service_role conserva el acceso (rollback sencillo). No borra ni modifica las funciones.
--
-- Antes de aplicar, confirmar que nada más las llama con el JWT del usuario:
--   * Web (art-rider): NO las llama (createBooking inserta en `bookings` directamente; ver informe).
--   * Móvil: los wrappers createBooking / createPackageBooking (bookingsService.ts) y createCartOrder (cartService.ts) las llaman con RPC
--     pero no se importan desde ninguna pantalla (el pago pasa por la edge `kushki-charge`); quedarán rotos y conviene borrarlos.

BEGIN;

REVOKE ALL ON FUNCTION public.create_booking(uuid, date, date, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_package_booking(uuid, date, date, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_cart_order(text, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_booking(uuid, date, date, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_package_booking(uuid, date, date, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_cart_order(text, integer) TO service_role;

COMMIT;

-- Verificación (solo lectura): authenticated = false y anon = false en las tres.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
       has_function_privilege('service_role', p.oid, 'EXECUTE')  AS service_role
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('create_booking', 'create_package_booking', 'create_cart_order')
ORDER BY 1;

-- ── Reversión (si algo dependía de ellas) ───────────────────────────────────────────────────────────────────────────────
-- GRANT EXECUTE ON FUNCTION public.create_booking(uuid, date, date, text, integer, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.create_package_booking(uuid, date, date, text, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.create_cart_order(text, integer) TO authenticated;
