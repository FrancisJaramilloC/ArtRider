-- APLICADO en producción el 2026-11-20 (PASO 1 y PASO 2 aplicados y verificados).
-- Arregla C1 de docs/AUDITORIA_SEGURIDAD.md.
--
-- Problema: create_booking / create_package_booking / create_cart_order las puede llamar cualquier usuario autenticado
-- (POST /rest/v1/rpc/...) con un p_kushki_ticket inventado, y crean reservas sin cobro.
--
-- Solución (dos pasos; este archivo es el PASO 1):
--   1. Funciones NUEVAS *_for que reciben p_client_id y solo puede ejecutar service_role. Solo la Edge Function `kushki-charge`
--      las llama, con el id que devolvió auth.getUser() (nunca uno que llegue del cliente). Las funciones viejas quedan INTACTAS.
--   2. Después de probar el pago con las nuevas, aplicar docs/PROPUESTA_C1_REVOCAR_VIEJAS.sql (revoca EXECUTE de las viejas).
--
-- Validación extra: el ticket de Kushki no puede estar ya registrado en otra reserva, pedido o checkout_order. Se hace con una
-- comprobación bajo pg_advisory_xact_lock(ticket) —no con un UNIQUE— porque en una compra del carrito el MISMO ticket lo comparten
-- varias reservas (una por línea) y porque puede haber datos históricos duplicados que harían fallar el índice.
--
-- Diferencias con las funciones viejas (intencionadas):
--   * p_client_id obligatorio y debe existir en profiles ('Cliente no encontrado').
--   * p_kushki_ticket obligatorio (no vacío): una reserva sin cobro ya no se puede crear por esta vía.
--   * p_expected_total obligatorio: kushki-charge siempre lo envía (el total oficial que acaba de cobrar).
--   * Todo lo demás (precios, redondeo .99, reparto de tarifa, disponibilidad, mensajes de error) es idéntico y reutiliza
--     _pricing_rates, rider_daily_price, cart_total, _cart_lines y _insert_*_booking.
--
-- Orden de ejecución completo: ver el informe de la tarea (apply → verificar → deploy edge → probar → revocar viejas).

BEGIN;

-- ── Helper: el ticket no debe estar ya usado ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._assert_ticket_unused(p_ticket text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_ticket IS NULL OR btrim(p_ticket) = '' THEN
    RAISE EXCEPTION 'TICKET_REQUERIDO';
  END IF;

  -- Serializa a quien intente usar el mismo ticket a la vez; el bloqueo se libera al terminar la transacción.
  PERFORM pg_advisory_xact_lock(hashtextextended('kushki_ticket:' || p_ticket, 0));

  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.kushki_ticket = p_ticket)
     OR EXISTS (SELECT 1 FROM public.orders o WHERE o.kushki_ticket = p_ticket)
     OR EXISTS (SELECT 1 FROM public.checkout_orders c WHERE c.kushki_ticket = p_ticket) THEN
    RAISE EXCEPTION 'TICKET_YA_USADO';
  END IF;
END;
$$;

-- ── create_booking_for ──────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_booking_for(
  p_client_id uuid,
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_kushki_ticket text,
  p_quantity integer,
  p_expected_total integer
)
RETURNS TABLE(booking_id uuid, subtotal integer, service_fee integer, total integer, days integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission NUMERIC; v_fee NUMERIC;
  v_daily integer; v_days integer; v_partner integer; v_subtotal integer; v_total integer; v_service_fee integer;
  v_booking_id uuid;
BEGIN
  IF p_client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_client_id) THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
  IF p_expected_total IS NULL THEN RAISE EXCEPTION 'Falta el total esperado'; END IF;
  PERFORM public._assert_ticket_unused(p_kushki_ticket);

  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT l.daily_price INTO v_daily FROM listings l WHERE l.id = p_listing_id AND l.is_published = TRUE AND l.deleted_at IS NULL;
  IF v_daily IS NULL THEN RAISE EXCEPTION 'Equipo no encontrado'; END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_days < 1 THEN RAISE EXCEPTION 'Rango de fechas inválido'; END IF;

  v_partner  := v_daily * v_days * p_quantity;
  v_subtotal := public.rider_daily_price(v_daily, v_commission) * v_days * p_quantity;
  v_total    := public.cart_total(v_subtotal, v_fee);
  v_service_fee := v_total - v_subtotal;

  IF p_expected_total <> v_total THEN
    RAISE EXCEPTION 'PRECIO_CAMBIO:%', v_total;
  END IF;

  v_booking_id := public._insert_listing_booking(
    p_client_id, p_listing_id, p_start_date, p_end_date, p_quantity, p_kushki_ticket, NULL,
    v_partner, v_subtotal, v_service_fee, v_commission, v_fee
  );
  RETURN QUERY SELECT v_booking_id, v_subtotal, v_service_fee, v_total, v_days;
END;
$$;

-- ── create_package_booking_for ──────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_package_booking_for(
  p_client_id uuid,
  p_package_id uuid,
  p_start_date date,
  p_end_date date,
  p_kushki_ticket text,
  p_expected_total integer
)
RETURNS TABLE(booking_id uuid, subtotal integer, service_fee integer, total integer, days integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission NUMERIC; v_fee NUMERIC;
  v_daily integer; v_days integer; v_partner integer; v_subtotal integer; v_total integer; v_service_fee integer;
  v_booking_id uuid;
BEGIN
  IF p_client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_client_id) THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;
  IF p_expected_total IS NULL THEN RAISE EXCEPTION 'Falta el total esperado'; END IF;
  PERFORM public._assert_ticket_unused(p_kushki_ticket);

  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT pkg.daily_price INTO v_daily FROM packages pkg WHERE pkg.id = p_package_id AND pkg.is_published = TRUE AND pkg.deleted_at IS NULL;
  IF v_daily IS NULL THEN RAISE EXCEPTION 'Paquete no encontrado'; END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_days < 1 THEN RAISE EXCEPTION 'Rango de fechas inválido'; END IF;

  v_partner  := v_daily * v_days;
  v_subtotal := public.rider_daily_price(v_daily, v_commission) * v_days;
  v_total    := public.cart_total(v_subtotal, v_fee);
  v_service_fee := v_total - v_subtotal;

  IF p_expected_total <> v_total THEN
    RAISE EXCEPTION 'PRECIO_CAMBIO:%', v_total;
  END IF;

  v_booking_id := public._insert_package_booking(
    p_client_id, p_package_id, p_start_date, p_end_date, p_kushki_ticket, NULL,
    v_partner, v_subtotal, v_service_fee, v_commission, v_fee
  );
  RETURN QUERY SELECT v_booking_id, v_subtotal, v_service_fee, v_total, v_days;
END;
$$;

-- ── create_cart_order_for ───────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_cart_order_for(
  p_client_id uuid,
  p_kushki_ticket text,
  p_expected_total integer
)
RETURNS TABLE(order_id uuid, total integer, booking_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission NUMERIC; v_fee NUMERIC;
  v_subtotal integer; v_partner integer; v_count integer; v_missing integer;
  v_total integer; v_fee_total integer;
  v_order_id uuid;
  v_booking_ids uuid[] := '{}';
  v_line record;
  v_booking_id uuid;
  v_index integer := 0;
  v_allocated integer := 0;
  v_line_fee integer;
BEGIN
  IF p_client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_client_id) THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;
  IF p_expected_total IS NULL THEN RAISE EXCEPTION 'Falta el total esperado'; END IF;
  PERFORM public._assert_ticket_unused(p_kushki_ticket);

  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT COALESCE(SUM(l.rider_subtotal), 0), COALESCE(SUM(l.partner_amount), 0), COUNT(*), COUNT(*) FILTER (WHERE l.partner_daily IS NULL)
    INTO v_subtotal, v_partner, v_count, v_missing
  FROM public._cart_lines(p_client_id) l;

  IF v_count = 0 THEN RAISE EXCEPTION 'El carrito está vacío'; END IF;
  IF v_missing > 0 THEN RAISE EXCEPTION 'Un item del carrito ya no está disponible'; END IF;

  v_total := public.cart_total(v_subtotal, v_fee);
  v_fee_total := v_total - v_subtotal;

  IF p_expected_total <> v_total THEN
    RAISE EXCEPTION 'PRECIO_CAMBIO:%', v_total;
  END IF;

  -- El pedido nace con sus montos FINALES: no hay UPDATE posterior de totales.
  INSERT INTO orders (client_id, total_price, kushki_ticket, subtotal, service_fee, partner_amount, partner_commission_rate, service_fee_rate)
  VALUES (p_client_id, v_total, p_kushki_ticket, v_subtotal, v_fee_total, v_partner, v_commission, v_fee)
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM public._cart_lines(p_client_id) ORDER BY cart_item_id LOOP
    v_index := v_index + 1;
    IF v_index = v_count THEN
      v_line_fee := v_fee_total - v_allocated;
    ELSE
      -- ROUND-half-up(fee_total × subtotal_línea / subtotal) con enteros.
      v_line_fee := ((v_fee_total::bigint * v_line.rider_subtotal * 2 + v_subtotal) / (2::bigint * v_subtotal))::integer;
      v_allocated := v_allocated + v_line_fee;
    END IF;

    BEGIN
      IF v_line.item_type = 'listing' THEN
        v_booking_id := public._insert_listing_booking(
          p_client_id, v_line.listing_id, v_line.start_date, v_line.end_date, v_line.quantity, p_kushki_ticket, v_order_id,
          v_line.partner_amount, v_line.rider_subtotal, v_line_fee, v_commission, v_fee
        );
      ELSE
        v_booking_id := public._insert_package_booking(
          p_client_id, v_line.package_id, v_line.start_date, v_line.end_date, p_kushki_ticket, v_order_id,
          v_line.partner_amount, v_line.rider_subtotal, v_line_fee, v_commission, v_fee
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '"%": %', COALESCE(v_line.title, 'Item'), SQLERRM;
    END;

    v_booking_ids := array_append(v_booking_ids, v_booking_id);
  END LOOP;

  DELETE FROM cart_items WHERE client_id = p_client_id;
  RETURN QUERY SELECT v_order_id, v_total, v_booking_ids;
END;
$$;

-- ── Permisos: SOLO service_role ─────────────────────────────────────────────────────────────────────────────────────────
-- Supabase concede EXECUTE a anon/authenticated por defecto en `public`: se revoca explícitamente además de PUBLIC.
REVOKE ALL ON FUNCTION public._assert_ticket_unused(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_booking_for(uuid, uuid, date, date, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_package_booking_for(uuid, uuid, date, date, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_cart_order_for(uuid, text, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_booking_for(uuid, uuid, date, date, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_package_booking_for(uuid, uuid, date, date, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_cart_order_for(uuid, text, integer) TO service_role;

COMMIT;


-- ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — ejecutar DESPUÉS del COMMIT de arriba, como `postgres` (SQL Editor). Todo termina en ROLLBACK: no deja datos.
-- Resultado esperado: tres NOTICE «OK …» y la consulta de permisos con anon=f, authenticated=f, service_role=t.
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- (a) Permisos efectivos (solo lectura).
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
       has_function_privilege('service_role', p.oid, 'EXECUTE')  AS service_role
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_booking_for', 'create_package_booking_for', 'create_cart_order_for', '_assert_ticket_unused')
ORDER BY 1;

-- (b) Un usuario autenticado y anon NO pueden ejecutarlas; service_role sí (llega a la validación de negocio, sin escribir nada).
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.create_booking_for('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
                                    current_date, current_date, 'ticket-falso', 1, 100);
  RAISE EXCEPTION 'FALLO: authenticated pudo ejecutar create_booking_for';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'OK: authenticated no puede ejecutar create_booking_for';
END $$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.create_cart_order_for('00000000-0000-0000-0000-000000000001', 'ticket-falso', 100);
  RAISE EXCEPTION 'FALLO: anon pudo ejecutar create_cart_order_for';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'OK: anon no puede ejecutar create_cart_order_for';
END $$;

RESET ROLE;
SET LOCAL ROLE service_role;
DO $$
BEGIN
  -- Cliente inexistente: debe fallar por NEGOCIO ('Cliente no encontrado'), no por permisos.
  PERFORM public.create_package_booking_for('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
                                            current_date, current_date, 'ticket-falso', 100);
  RAISE EXCEPTION 'FALLO: debía rechazar al cliente inexistente';
EXCEPTION
  WHEN insufficient_privilege THEN RAISE EXCEPTION 'FALLO: service_role sin EXECUTE';
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Cliente no encontrado%' THEN
      RAISE NOTICE 'OK: service_role ejecuta y valida (Cliente no encontrado)';
    ELSE
      RAISE EXCEPTION 'FALLO inesperado: %', SQLERRM;
    END IF;
END $$;
ROLLBACK;

-- (c) Un ticket ya usado se rechaza (solo si existe alguna reserva con ticket; si no, no hace nada).
BEGIN;
DO $$
DECLARE v_ticket text;
BEGIN
  SELECT b.kushki_ticket INTO v_ticket FROM public.bookings b WHERE b.kushki_ticket IS NOT NULL AND btrim(b.kushki_ticket) <> '' LIMIT 1;
  IF v_ticket IS NULL THEN
    RAISE NOTICE 'OMITIDO: no hay reservas con ticket para comprobar la duplicación';
    RETURN;
  END IF;
  BEGIN
    PERFORM public._assert_ticket_unused(v_ticket);
    RAISE EXCEPTION 'FALLO: aceptó un ticket ya usado';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TICKET_YA_USADO' THEN
      RAISE NOTICE 'OK: ticket ya usado rechazado';
    ELSE
      RAISE EXCEPTION 'FALLO inesperado: %', SQLERRM;
    END IF;
  END;
END $$;
ROLLBACK;

-- ── Reversión de este paso (si hiciera falta) ───────────────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.create_booking_for(uuid, uuid, date, date, text, integer, integer);
-- DROP FUNCTION IF EXISTS public.create_package_booking_for(uuid, uuid, date, date, text, integer);
-- DROP FUNCTION IF EXISTS public.create_cart_order_for(uuid, text, integer);
-- DROP FUNCTION IF EXISTS public._assert_ticket_unused(text);
