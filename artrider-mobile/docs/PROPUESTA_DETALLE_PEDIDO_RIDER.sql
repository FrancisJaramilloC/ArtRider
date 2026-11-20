-- APLICADO en producción el 2026-11-20 (verificado).
--
-- RPC get_client_order_detail(p_order_id uuid): todo lo que necesita la pantalla «Detalle del pedido» del Rider (compra del carrito
-- con varias reservas que comparten bookings.order_id), en UNA llamada.
--   * SECURITY DEFINER, search_path = public. El pedido debe ser del usuario (orders.client_id = auth.uid()).
--     Si no existe o es de otra persona responde lo mismo ('Pedido no encontrado'): no revela si el id existe.
--   * Solo lo que el Rider puede ver: total, subtotal y tarifa de servicio del RIDER, y por línea su subtotal, tarifa y total.
--     NUNCA devuelve partner_amount, partner_commission_rate ni service_fee_rate (ni de orders ni de bookings), ni platform_revenue.
--     Sin teléfono ni dirección (eso lo da el detalle de cada reserva).
--   * Devuelve un solo jsonb: { order: {...}, lines: [...] }. Las líneas salen ordenadas por created_at, id.
--   * Permisos: solo `authenticated` (REVOKE a PUBLIC y anon).
--
-- Columnas de `orders` confirmadas en producción: id, client_id, total_price, status, kushki_ticket, created_at, subtotal, service_fee,
-- partner_amount, partner_commission_rate, service_fee_rate. RLS: «select own orders» (auth.uid() = client_id).
--   * subtotal y service_fee de orders se leen directo. En pedidos viejos (anteriores al modelo de precios) son NULL:
--       subtotal    = COALESCE(orders.subtotal, Σ rider_subtotal de las líneas, solo si TODAS las líneas lo tienen)
--       service_fee = COALESCE(orders.service_fee, total_price − subtotal)
--     Si aun así no se puede calcular (pedido viejo sin desglose en las líneas) devuelve NULL y la app aplica el desglose antiguo
--     (riderBreakdownOf). Nunca se inventa un 0.
--
-- Supuestos sobre bookings (no confirmados columna por columna; por eso las líneas leen rider_subtotal y service_fee con to_jsonb(b)->>,
-- que devuelve NULL en vez de fallar si faltaran): id, client_id, order_id, status, start_date, end_date, created_at, total_price,
-- provider_id, snapshot_listing (jsonb con id, type, title, quantity).
-- Otras tablas: listings.cover_image_url, packages.cover_image_url, providers.brand_name, reviews(booking_id, author_id).
-- Los pedidos de la WEB (checkout_orders / bookings.checkout_order_id) NO se cubren: esa tabla es distinta y el móvil no la usa.

BEGIN;

DROP FUNCTION IF EXISTS public.get_client_order_detail(uuid);

CREATE FUNCTION public.get_client_order_detail(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_o orders%ROWTYPE;
  v_lines jsonb;
  v_lines_subtotal integer;
  v_subtotal integer;
  v_service_fee integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_o FROM orders WHERE id = p_order_id AND client_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  -- Líneas del pedido (solo reservas del mismo usuario).
  SELECT COALESCE(jsonb_agg(l.line ORDER BY l.created_at, l.id), '[]'::jsonb) INTO v_lines
  FROM (
    SELECT
      b.id,
      b.created_at,
      jsonb_build_object(
        'booking_id', b.id,
        'status', b.status::text,
        'start_date', b.start_date,
        'end_date', b.end_date,
        'item_type', CASE WHEN b.snapshot_listing ->> 'type' = 'package' THEN 'package' ELSE 'listing' END,
        'title', b.snapshot_listing ->> 'title',
        'quantity', COALESCE(NULLIF(b.snapshot_listing ->> 'quantity', '')::integer, 1),
        'cover_image_url', CASE
          WHEN b.snapshot_listing ->> 'type' = 'package'
            THEN (SELECT pkg.cover_image_url FROM packages pkg WHERE pkg.id = NULLIF(b.snapshot_listing ->> 'id', '')::uuid)
          ELSE (SELECT li.cover_image_url FROM listings li WHERE li.id = NULLIF(b.snapshot_listing ->> 'id', '')::uuid)
        END,
        'provider_name', (SELECT p.brand_name FROM providers p WHERE p.id = b.provider_id),
        'rider_subtotal', (to_jsonb(b) ->> 'rider_subtotal')::integer,
        'service_fee', (to_jsonb(b) ->> 'service_fee')::integer,
        'total_price', b.total_price,
        'already_reviewed', EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id AND r.author_id = v_user)
      ) AS line
    FROM bookings b
    WHERE b.order_id = v_o.id AND b.client_id = v_user
  ) l;

  -- Pedidos viejos: si el pedido no guardó el desglose, se suma el de las líneas (solo si todas lo tienen).
  SELECT CASE WHEN count(*) > 0 AND bool_and((to_jsonb(b) ->> 'rider_subtotal') IS NOT NULL)
              THEN sum((to_jsonb(b) ->> 'rider_subtotal')::integer)::integer END
    INTO v_lines_subtotal
  FROM bookings b
  WHERE b.order_id = v_o.id AND b.client_id = v_user;

  v_subtotal := COALESCE(v_o.subtotal, v_lines_subtotal);
  v_service_fee := COALESCE(v_o.service_fee, v_o.total_price - v_subtotal);  -- NULL si v_subtotal es NULL

  RETURN jsonb_build_object(
    'order', jsonb_build_object(
      'order_id', v_o.id,
      'status', v_o.status::text,
      'created_at', v_o.created_at,
      'total_price', v_o.total_price,
      'subtotal', v_subtotal,
      'service_fee', v_service_fee,
      'kushki_ticket', v_o.kushki_ticket
    ),
    'lines', v_lines
  );
END;
$$;

-- DROP + CREATE reinicia los permisos: se dejan explícitos. Solo usuarios con sesión.
REVOKE ALL ON FUNCTION public.get_client_order_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_order_detail(uuid) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (después de aplicar). Se simula a un usuario SIN tocar datos: cada bloque es una transacción que termina en ROLLBACK.
-- Ejecutar CADA bloque por separado. Pedido de prueba: 41b0ba1f-f924-4286-a5c0-8df325b98766.
-- El dueño se lee de orders ANTES de cambiar de rol (la subconsulta corre como el rol de la conexión, no como `authenticated`).
--
-- (1) El DUEÑO ve su pedido. Esperado: 1 fila; `order` con order_id, status, created_at, total_price, subtotal, service_fee, kushki_ticket;
--     `lines` con una entrada por reserva; las tres columnas de abajo en false (la respuesta no contiene datos del Partner).
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', (SELECT client_id FROM public.orders WHERE id = '41b0ba1f-f924-4286-a5c0-8df325b98766'), 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  WITH r AS (SELECT public.get_client_order_detail('41b0ba1f-f924-4286-a5c0-8df325b98766'::uuid) AS d)
  SELECT
    r.d AS respuesta,
    jsonb_array_length(r.d -> 'lines')                                                    AS n_lineas,
    (SELECT COALESCE(sum((x ->> 'total_price')::integer), 0) FROM jsonb_array_elements(r.d -> 'lines') x) AS suma_lineas,
    (r.d -> 'order' ->> 'total_price')::integer                                           AS total_pedido,
    r.d::text ~ 'partner_amount'                                                          AS filtra_partner_amount,
    r.d::text ~ 'partner_commission_rate'                                                 AS filtra_comision,
    r.d::text ~ 'service_fee_rate'                                                        AS filtra_tasa_tarifa
  FROM r;
ROLLBACK;
--     Comprobar: suma_lineas = total_pedido (pedidos del modelo nuevo) y filtra_* = false.
--
-- (2) OTRO usuario NO lo ve. Esperado: ERROR «Pedido no encontrado» (la transacción queda abortada; el ROLLBACK la limpia).
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT public.get_client_order_detail('41b0ba1f-f924-4286-a5c0-8df325b98766'::uuid);
ROLLBACK;
--
-- (3) Sin sesión (anon) no puede ni llamarla. Esperado: ERROR «permission denied for function get_client_order_detail».
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.get_client_order_detail('41b0ba1f-f924-4286-a5c0-8df325b98766'::uuid);
ROLLBACK;
--
-- (4) Permisos (solo lectura). Esperado: anon = false, authenticated = true. service_role puede salir true por los permisos por defecto
--     de Supabase; no es un riesgo (ya salta RLS) pero se muestra para que lo veas. `publico` es PUBLIC: debe ser false.
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
       has_function_privilege('service_role', p.oid, 'EXECUTE')  AS service_role,
       (SELECT COALESCE(bool_or(a.grantee = 0), false) FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
         WHERE a.privilege_type = 'EXECUTE')                       AS publico,
       p.prosecdef                                                AS security_definer,
       p.proconfig                                                AS config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_client_order_detail';
--     Esperado además: security_definer = true y config = {search_path=public}.
-- ─────────────────────────────────────────────────────────────────────────
