-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
--
-- Nuevas versiones de los RPC de precio y reserva con el modelo nuevo (ver docs/PROPUESTA_PRECIOS_PLAN.md).
-- REQUISITO: aplicar ANTES docs/PROPUESTA_PRECIOS_CONFIG.sql (tabla pricing_settings, funciones de cálculo y columnas nuevas).
-- Basado en las definiciones reales exportadas de la base (docs/Supabase Snippet Untitled query.csv).
--
-- Modelo (todo en centavos, aritmética entera/NUMERIC, nunca coma flotante):
--   precio Rider por día = ceil(precio_partner × (1 + comisión))             rider_daily_price()
--   subtotal             = Σ precio Rider × días × cantidad
--   total                = cart_total(subtotal, tasa_servicio)                  (.99 UNA sola vez, sobre el carrito completo)
--   service_fee          = total − subtotal
--   partner_amount       = Σ precio Partner × días × cantidad                  (lo que gana el Partner, exacto)
--   ArtRider             = total − partner_amount                              (platform_revenue, absorbe el redondeo)
-- Cada reserva y pedido GUARDA montos y tasas del momento de la compra. Ninguna función modifica esos montos después de insertar
-- (no hay UPDATE de total_price ni de service_fee), así el trigger prevent_booking_pricing_mutation es seguro.
-- En un carrito, cada línea es UNA reserva (como hoy): la tarifa del pedido se reparte entre las reservas en proporción a su subtotal y la
-- última absorbe el resto; Σ total_price de las reservas = total del pedido, y cada reserva cumple total_price = rider_subtotal + service_fee.
--
-- ORDEN DE EJECUCIÓN DE ESTE ARCHIVO: de arriba a abajo, en UNA sola transacción (BEGIN; … COMMIT;): o se aplica todo o nada.
-- Si cualquier sentencia falla, la transacción queda abortada: ejecutar ROLLBACK; (el SQL editor de Supabase lo hace solo al terminar con error).
-- Todo lo que contiene (DROP/CREATE FUNCTION, REVOKE, GRANT) es transaccional; no hay COMMIT/ROLLBACK intermedios.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 0) Quitar las firmas antiguas (CREATE OR REPLACE con otros parámetros/retorno crearía sobrecargas nuevas o fallaría)
-- ─────────────────────────────────────────────────────────────────────────
-- create_booking tiene DOS sobrecargas en la base real:
--   (uuid, date, date, text)            ← antigua: sin cantidad, 1 sola unidad. NINGÚN código la llama a propósito
--   (uuid, date, date, text, integer)   ← vigente: la usan kushki-charge (p_quantity) y create_cart_order (5.º argumento)
-- Mientras ambas existan, una llamada de 4 argumentos es ambigua. Se eliminan las dos y se crea una sola con cantidad y total esperado.
DROP FUNCTION IF EXISTS public.create_booking(uuid, date, date, text);
DROP FUNCTION IF EXISTS public.create_booking(uuid, date, date, text, integer);
DROP FUNCTION IF EXISTS public.create_package_booking(uuid, date, date, text);
DROP FUNCTION IF EXISTS public.create_cart_order(text);
DROP FUNCTION IF EXISTS public.get_provider_bookings();

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Ayudantes internos (no expuestos a usuarios)
-- ─────────────────────────────────────────────────────────────────────────

-- Tasas vigentes. Si falta la configuración, el servidor NO adivina: falla.
CREATE OR REPLACE FUNCTION public._pricing_rates(OUT commission NUMERIC, OUT fee NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT s.partner_commission_rate, s.service_fee_rate INTO commission, fee FROM pricing_settings s LIMIT 1;
  IF commission IS NULL OR fee IS NULL THEN
    RAISE EXCEPTION 'Falta la configuración de precios';
  END IF;
END;
$$;

-- Líneas del carrito del cliente con precios del Partner y del Rider. Packs: cantidad siempre 1 (se reserva una vez, como en create_package_booking;
-- verificado: packages no tiene columna quantity, y el create_cart_order real llama a create_package_booking SIN cantidad).
-- Columnas de cart_items confirmadas por el create_cart_order real: client_id, item_type, listing_id, package_id, start_date, end_date, quantity.
-- `id` no aparece en ningún RPC exportado (solo lo usa la app: select id / delete .eq('id')); por eso se devuelve como texto.
CREATE OR REPLACE FUNCTION public._cart_lines(p_client uuid)
RETURNS TABLE (
  cart_item_id text, item_type text, listing_id uuid, package_id uuid, provider_id uuid, title text,
  start_date date, end_date date, quantity integer, days integer,
  partner_daily integer, rider_daily integer, partner_amount integer, rider_subtotal integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_commission NUMERIC;
  v_fee NUMERIC;
BEGIN
  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  RETURN QUERY
  SELECT
    ci.id::text,   -- cart_items no está definida en el repo: se tipa como texto para no depender de si id es uuid o bigint
    ci.item_type::text,
    ci.listing_id,
    ci.package_id,
    COALESCE(l.provider_id, pkg.provider_id),
    COALESCE(l.title, pkg.title),
    ci.start_date,
    ci.end_date,
    CASE WHEN ci.item_type::text = 'listing' THEN GREATEST(ci.quantity, 1) ELSE 1 END,
    (ci.end_date - ci.start_date) + 1,
    COALESCE(l.daily_price, pkg.daily_price),
    public.rider_daily_price(COALESCE(l.daily_price, pkg.daily_price), v_commission),
    COALESCE(l.daily_price, pkg.daily_price)
      * CASE WHEN ci.item_type::text = 'listing' THEN GREATEST(ci.quantity, 1) ELSE 1 END
      * ((ci.end_date - ci.start_date) + 1),
    public.rider_daily_price(COALESCE(l.daily_price, pkg.daily_price), v_commission)
      * CASE WHEN ci.item_type::text = 'listing' THEN GREATEST(ci.quantity, 1) ELSE 1 END
      * ((ci.end_date - ci.start_date) + 1)
  FROM cart_items ci
  LEFT JOIN listings l ON l.id = ci.listing_id AND l.is_published = TRUE AND l.deleted_at IS NULL
  LEFT JOIN packages pkg ON pkg.id = ci.package_id AND pkg.is_published = TRUE AND pkg.deleted_at IS NULL
  WHERE ci.client_id = p_client
  ORDER BY ci.id;
END;
$$;

-- Inserta UNA reserva de equipo con los montos ya calculados y asigna unidades (misma lógica de disponibilidad que antes).
CREATE OR REPLACE FUNCTION public._insert_listing_booking(
  p_user uuid, p_listing_id uuid, p_start date, p_end date, p_quantity integer, p_ticket text, p_order_id uuid,
  p_partner_amount integer, p_rider_subtotal integer, p_service_fee integer, p_commission NUMERIC, p_fee_rate NUMERIC
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_provider_id uuid;
  v_provider_user_id uuid;
  v_daily_price integer;
  v_title text;
  v_booking_id uuid;
  v_unit_id uuid;
  v_found_count integer := 0;
BEGIN
  SELECT l.provider_id, l.daily_price, l.title INTO v_provider_id, v_daily_price, v_title
  FROM listings l WHERE l.id = p_listing_id AND l.is_published = TRUE AND l.deleted_at IS NULL;
  IF v_provider_id IS NULL THEN RAISE EXCEPTION 'Equipo no encontrado'; END IF;

  SELECT p.user_id INTO v_provider_user_id FROM providers p WHERE p.id = v_provider_id;
  IF v_provider_user_id = p_user THEN RAISE EXCEPTION 'No puedes reservar tu propio equipo'; END IF;

  INSERT INTO bookings (
    client_id, provider_id, start_date, end_date, total_price, status, snapshot_listing, kushki_ticket, order_id,
    partner_amount, rider_subtotal, service_fee, partner_commission_rate, service_fee_rate
  ) VALUES (
    p_user, v_provider_id, p_start, p_end, p_rider_subtotal + p_service_fee, 'AWAITING_SIGNATURES',
    jsonb_build_object('id', p_listing_id, 'title', v_title, 'daily_price', v_daily_price, 'quantity', p_quantity),
    p_ticket, p_order_id,
    p_partner_amount, p_rider_subtotal, p_service_fee, p_commission, p_fee_rate
  ) RETURNING id INTO v_booking_id;

  FOR v_unit_id IN
    SELECT eu.id FROM equipment_units eu
    WHERE eu.listing_id = p_listing_id
      AND eu.internal_status = 'AVAILABLE'
      AND NOT EXISTS (
        SELECT 1 FROM booking_units bu JOIN bookings b ON b.id = bu.booking_id
        WHERE bu.equipment_unit_id = eu.id AND b.status NOT IN ('CANCELLED', 'ARCHIVED')
          AND b.start_date <= p_end AND b.end_date >= p_start
      )
      AND NOT EXISTS (
        SELECT 1 FROM availability_calendar ac
        WHERE ac.equipment_unit_id = eu.id AND ac.status IN ('MAINTENANCE', 'BLOCKED')
          AND ac.start_date <= p_end AND ac.end_date >= p_start
      )
    LIMIT p_quantity
  LOOP
    INSERT INTO booking_units (booking_id, equipment_unit_id, locked_daily_price) VALUES (v_booking_id, v_unit_id, v_daily_price);
    v_found_count := v_found_count + 1;
  END LOOP;

  IF v_found_count < p_quantity THEN
    RAISE EXCEPTION 'No hay % unidades disponibles para esas fechas', p_quantity;
  END IF;
  RETURN v_booking_id;
END;
$$;

-- Inserta UNA reserva de paquete con los montos ya calculados y reserva la cantidad exacta de unidades de cada equipo.
CREATE OR REPLACE FUNCTION public._insert_package_booking(
  p_user uuid, p_package_id uuid, p_start date, p_end date, p_ticket text, p_order_id uuid,
  p_partner_amount integer, p_rider_subtotal integer, p_service_fee integer, p_commission NUMERIC, p_fee_rate NUMERIC
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_provider_id uuid;
  v_provider_user_id uuid;
  v_daily_price integer;
  v_title text;
  v_booking_id uuid;
  v_item record;
  v_unit_id uuid;
  v_found_count integer;
BEGIN
  SELECT pkg.provider_id, pkg.daily_price, pkg.title INTO v_provider_id, v_daily_price, v_title
  FROM packages pkg WHERE pkg.id = p_package_id AND pkg.is_published = TRUE AND pkg.deleted_at IS NULL;
  IF v_provider_id IS NULL THEN RAISE EXCEPTION 'Paquete no encontrado'; END IF;

  SELECT p.user_id INTO v_provider_user_id FROM providers p WHERE p.id = v_provider_id;
  IF v_provider_user_id = p_user THEN RAISE EXCEPTION 'No puedes reservar tu propio paquete'; END IF;

  INSERT INTO bookings (
    client_id, provider_id, start_date, end_date, total_price, status, snapshot_listing, kushki_ticket, order_id,
    partner_amount, rider_subtotal, service_fee, partner_commission_rate, service_fee_rate
  ) VALUES (
    p_user, v_provider_id, p_start, p_end, p_rider_subtotal + p_service_fee, 'AWAITING_SIGNATURES',
    jsonb_build_object('type', 'package', 'id', p_package_id, 'title', v_title, 'daily_price', v_daily_price),
    p_ticket, p_order_id,
    p_partner_amount, p_rider_subtotal, p_service_fee, p_commission, p_fee_rate
  ) RETURNING id INTO v_booking_id;

  FOR v_item IN
    SELECT pi.listing_id, pi.quantity, l.daily_price AS item_daily_price
    FROM package_items pi JOIN listings l ON l.id = pi.listing_id
    WHERE pi.package_id = p_package_id
  LOOP
    v_found_count := 0;
    FOR v_unit_id IN
      SELECT eu.id FROM equipment_units eu
      WHERE eu.listing_id = v_item.listing_id
        AND eu.internal_status = 'AVAILABLE'
        AND NOT EXISTS (
          SELECT 1 FROM booking_units bu JOIN bookings b ON b.id = bu.booking_id
          WHERE bu.equipment_unit_id = eu.id AND b.status NOT IN ('CANCELLED', 'ARCHIVED')
            AND b.start_date <= p_end AND b.end_date >= p_start
        )
        AND NOT EXISTS (
          SELECT 1 FROM availability_calendar ac
          WHERE ac.equipment_unit_id = eu.id AND ac.status IN ('MAINTENANCE', 'BLOCKED')
            AND ac.start_date <= p_end AND ac.end_date >= p_start
        )
      LIMIT v_item.quantity
    LOOP
      INSERT INTO booking_units (booking_id, equipment_unit_id, locked_daily_price) VALUES (v_booking_id, v_unit_id, v_item.item_daily_price);
      v_found_count := v_found_count + 1;
    END LOOP;
    IF v_found_count < v_item.quantity THEN
      RAISE EXCEPTION 'No hay suficiente stock disponible para uno de los equipos del paquete en esas fechas';
    END IF;
  END LOOP;
  RETURN v_booking_id;
END;
$$;

-- Los ayudantes NO son llamables por usuarios; solo los RPC públicos (SECURITY DEFINER) los usan.
REVOKE ALL ON FUNCTION public._pricing_rates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._cart_lines(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._insert_listing_booking(uuid, uuid, date, date, integer, text, uuid, integer, integer, integer, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._insert_package_booking(uuid, uuid, date, date, text, uuid, integer, integer, integer, numeric, numeric) FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Cotizaciones oficiales (las usa kushki-charge para saber CUÁNTO cobrar; la app puede mostrarlas)
-- ─────────────────────────────────────────────────────────────────────────

-- Subtotal del carrito con precios del Rider (antes devolvía precios del Partner; ahora es el subtotal real que se cobrará).
CREATE OR REPLACE FUNCTION public.get_cart_total()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(rider_subtotal), 0)::integer FROM public._cart_lines(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_cart_quote()
RETURNS TABLE (subtotal integer, service_fee integer, total integer, partner_amount integer, partner_commission_rate numeric, service_fee_rate numeric, item_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_commission NUMERIC; v_fee NUMERIC;
  v_subtotal integer; v_partner integer; v_count integer; v_missing integer; v_total integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT COALESCE(SUM(l.rider_subtotal), 0), COALESCE(SUM(l.partner_amount), 0), COUNT(*), COUNT(*) FILTER (WHERE l.partner_daily IS NULL)
    INTO v_subtotal, v_partner, v_count, v_missing
  FROM public._cart_lines(v_user) l;

  IF v_count = 0 THEN RAISE EXCEPTION 'El carrito está vacío'; END IF;
  IF v_missing > 0 THEN RAISE EXCEPTION 'Un item del carrito ya no está disponible'; END IF;

  v_total := public.cart_total(v_subtotal, v_fee);
  RETURN QUERY SELECT v_subtotal, v_total - v_subtotal, v_total, v_partner, v_commission, v_fee, v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_booking_quote(p_listing_id uuid, p_start_date date, p_end_date date, p_quantity integer DEFAULT 1)
RETURNS TABLE (subtotal integer, service_fee integer, total integer, days integer, partner_amount integer, partner_commission_rate numeric, service_fee_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_commission NUMERIC; v_fee NUMERIC;
  v_provider_id uuid; v_provider_user_id uuid; v_daily integer;
  v_days integer; v_subtotal integer; v_total integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT l.provider_id, l.daily_price INTO v_provider_id, v_daily
  FROM listings l WHERE l.id = p_listing_id AND l.is_published = TRUE AND l.deleted_at IS NULL;
  IF v_provider_id IS NULL THEN RAISE EXCEPTION 'Equipo no encontrado'; END IF;

  SELECT p.user_id INTO v_provider_user_id FROM providers p WHERE p.id = v_provider_id;
  IF v_provider_user_id = v_user THEN RAISE EXCEPTION 'No puedes reservar tu propio equipo'; END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_days < 1 THEN RAISE EXCEPTION 'Rango de fechas inválido'; END IF;

  v_subtotal := public.rider_daily_price(v_daily, v_commission) * v_days * p_quantity;
  v_total := public.cart_total(v_subtotal, v_fee);
  RETURN QUERY SELECT v_subtotal, v_total - v_subtotal, v_total, v_days, v_daily * v_days * p_quantity, v_commission, v_fee;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_package_quote(p_package_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE (subtotal integer, service_fee integer, total integer, days integer, partner_amount integer, partner_commission_rate numeric, service_fee_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_commission NUMERIC; v_fee NUMERIC;
  v_provider_id uuid; v_provider_user_id uuid; v_daily integer;
  v_days integer; v_subtotal integer; v_total integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT pkg.provider_id, pkg.daily_price INTO v_provider_id, v_daily
  FROM packages pkg WHERE pkg.id = p_package_id AND pkg.is_published = TRUE AND pkg.deleted_at IS NULL;
  IF v_provider_id IS NULL THEN RAISE EXCEPTION 'Paquete no encontrado'; END IF;

  SELECT p.user_id INTO v_provider_user_id FROM providers p WHERE p.id = v_provider_id;
  IF v_provider_user_id = v_user THEN RAISE EXCEPTION 'No puedes reservar tu propio paquete'; END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_days < 1 THEN RAISE EXCEPTION 'Rango de fechas inválido'; END IF;

  v_subtotal := public.rider_daily_price(v_daily, v_commission) * v_days;
  v_total := public.cart_total(v_subtotal, v_fee);
  RETURN QUERY SELECT v_subtotal, v_total - v_subtotal, v_total, v_days, v_daily * v_days, v_commission, v_fee;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) Crear reservas
--    p_expected_total (opcional): el total que se cobró. Si al reservar el cálculo da otro (p. ej. cambiaron las tasas entre
--    el cobro y la reserva), se aborta con 'PRECIO_CAMBIO:<total>' y la Edge Function anula el cobro.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_booking(
  p_listing_id uuid, p_start_date date, p_end_date date,
  p_kushki_ticket text DEFAULT NULL, p_quantity integer DEFAULT 1, p_expected_total integer DEFAULT NULL
) RETURNS TABLE (booking_id uuid, subtotal integer, service_fee integer, total integer, days integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_commission NUMERIC; v_fee NUMERIC;
  v_daily integer; v_days integer; v_partner integer; v_subtotal integer; v_total integer; v_service_fee integer;
  v_booking_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT l.daily_price INTO v_daily FROM listings l WHERE l.id = p_listing_id AND l.is_published = TRUE AND l.deleted_at IS NULL;
  IF v_daily IS NULL THEN RAISE EXCEPTION 'Equipo no encontrado'; END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_days < 1 THEN RAISE EXCEPTION 'Rango de fechas inválido'; END IF;

  v_partner  := v_daily * v_days * p_quantity;
  v_subtotal := public.rider_daily_price(v_daily, v_commission) * v_days * p_quantity;
  v_total    := public.cart_total(v_subtotal, v_fee);
  v_service_fee := v_total - v_subtotal;

  IF p_expected_total IS NOT NULL AND p_expected_total <> v_total THEN
    RAISE EXCEPTION 'PRECIO_CAMBIO:%', v_total;
  END IF;

  v_booking_id := public._insert_listing_booking(
    v_user, p_listing_id, p_start_date, p_end_date, p_quantity, p_kushki_ticket, NULL,
    v_partner, v_subtotal, v_service_fee, v_commission, v_fee
  );
  RETURN QUERY SELECT v_booking_id, v_subtotal, v_service_fee, v_total, v_days;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_package_booking(
  p_package_id uuid, p_start_date date, p_end_date date,
  p_kushki_ticket text DEFAULT NULL, p_expected_total integer DEFAULT NULL
) RETURNS TABLE (booking_id uuid, subtotal integer, service_fee integer, total integer, days integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_commission NUMERIC; v_fee NUMERIC;
  v_daily integer; v_days integer; v_partner integer; v_subtotal integer; v_total integer; v_service_fee integer;
  v_booking_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT pkg.daily_price INTO v_daily FROM packages pkg WHERE pkg.id = p_package_id AND pkg.is_published = TRUE AND pkg.deleted_at IS NULL;
  IF v_daily IS NULL THEN RAISE EXCEPTION 'Paquete no encontrado'; END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_days < 1 THEN RAISE EXCEPTION 'Rango de fechas inválido'; END IF;

  v_partner  := v_daily * v_days;
  v_subtotal := public.rider_daily_price(v_daily, v_commission) * v_days;
  v_total    := public.cart_total(v_subtotal, v_fee);
  v_service_fee := v_total - v_subtotal;

  IF p_expected_total IS NOT NULL AND p_expected_total <> v_total THEN
    RAISE EXCEPTION 'PRECIO_CAMBIO:%', v_total;
  END IF;

  v_booking_id := public._insert_package_booking(
    v_user, p_package_id, p_start_date, p_end_date, p_kushki_ticket, NULL,
    v_partner, v_subtotal, v_service_fee, v_commission, v_fee
  );
  RETURN QUERY SELECT v_booking_id, v_subtotal, v_service_fee, v_total, v_days;
END;
$$;

-- Carrito completo: UN solo cálculo y UN solo redondeo .99 sobre todo el pedido; luego una reserva por línea (como hoy).
-- Reparto de la tarifa: proporcional al subtotal de cada reserva (redondeo a la mitad hacia arriba) y la ÚLTIMA absorbe el resto.
CREATE OR REPLACE FUNCTION public.create_cart_order(p_kushki_ticket text DEFAULT NULL, p_expected_total integer DEFAULT NULL)
RETURNS TABLE (order_id uuid, total integer, booking_ids uuid[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
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
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT r.commission, r.fee INTO v_commission, v_fee FROM public._pricing_rates() r;

  SELECT COALESCE(SUM(l.rider_subtotal), 0), COALESCE(SUM(l.partner_amount), 0), COUNT(*), COUNT(*) FILTER (WHERE l.partner_daily IS NULL)
    INTO v_subtotal, v_partner, v_count, v_missing
  FROM public._cart_lines(v_user) l;

  IF v_count = 0 THEN RAISE EXCEPTION 'El carrito está vacío'; END IF;
  IF v_missing > 0 THEN RAISE EXCEPTION 'Un item del carrito ya no está disponible'; END IF;

  v_total := public.cart_total(v_subtotal, v_fee);
  v_fee_total := v_total - v_subtotal;

  IF p_expected_total IS NOT NULL AND p_expected_total <> v_total THEN
    RAISE EXCEPTION 'PRECIO_CAMBIO:%', v_total;
  END IF;

  -- El pedido nace con sus montos FINALES: no hay UPDATE posterior de totales.
  INSERT INTO orders (client_id, total_price, kushki_ticket, subtotal, service_fee, partner_amount, partner_commission_rate, service_fee_rate)
  VALUES (v_user, v_total, p_kushki_ticket, v_subtotal, v_fee_total, v_partner, v_commission, v_fee)
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM public._cart_lines(v_user) ORDER BY cart_item_id LOOP
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
          v_user, v_line.listing_id, v_line.start_date, v_line.end_date, v_line.quantity, p_kushki_ticket, v_order_id,
          v_line.partner_amount, v_line.rider_subtotal, v_line_fee, v_commission, v_fee
        );
      ELSE
        v_booking_id := public._insert_package_booking(
          v_user, v_line.package_id, v_line.start_date, v_line.end_date, p_kushki_ticket, v_order_id,
          v_line.partner_amount, v_line.rider_subtotal, v_line_fee, v_commission, v_fee
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '"%": %', COALESCE(v_line.title, 'Item'), SQLERRM;
    END;

    v_booking_ids := array_append(v_booking_ids, v_booking_id);
  END LOOP;

  DELETE FROM cart_items WHERE client_id = v_user;
  RETURN QUERY SELECT v_order_id, v_total, v_booking_ids;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4) Reservas del Partner: ahora también partner_amount y rider_subtotal (NULL en reservas anteriores al modelo)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_provider_bookings()
RETURNS TABLE (
  booking_id uuid, status text, start_date date, end_date date, total_price integer, created_at timestamptz,
  listing_title text, listing_cover_image_url text, client_name text, client_phone text, order_id uuid,
  already_reviewed boolean, listing_id uuid, partner_amount integer, rider_subtotal integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_provider_id uuid;
BEGIN
  SELECT id INTO v_provider_id FROM providers WHERE user_id = auth.uid();
  IF v_provider_id IS NULL THEN RAISE EXCEPTION 'No eres proveedor'; END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT DISTINCT ON (b.id)
      b.id AS booking_id, b.status::text AS status, b.start_date, b.end_date, b.total_price, b.created_at,
      COALESCE(b.snapshot_listing ->> 'title', l.title) AS listing_title,
      COALESCE(pkg.cover_image_url, l.cover_image_url) AS listing_cover_image_url,
      p.full_name AS client_name,
      CASE WHEN b.status IN ('ACTIVE', 'PAID', 'COMPLETED') THEN p.phone ELSE NULL END AS client_phone,
      b.order_id,
      EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id AND r.author_id = auth.uid()) AS already_reviewed,
      l.id AS listing_id,
      b.partner_amount,
      b.rider_subtotal
    FROM bookings b
    LEFT JOIN booking_units bu ON bu.booking_id = b.id
    LEFT JOIN equipment_units eu ON eu.id = bu.equipment_unit_id
    LEFT JOIN listings l ON l.id = eu.listing_id
    LEFT JOIN packages pkg ON pkg.id = (b.snapshot_listing ->> 'id')::uuid AND b.snapshot_listing ->> 'type' = 'package'
    LEFT JOIN profiles p ON p.id = b.client_id
    WHERE b.provider_id = v_provider_id AND b.status != 'ARCHIVED'
    ORDER BY b.id, bu.id
  ) sub
  ORDER BY created_at DESC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5) Permisos (DROP + CREATE reinicia los permisos: se dejan explícitos)
-- ─────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.create_booking(uuid, date, date, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_package_booking(uuid, date, date, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_cart_order(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_cart_total() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_cart_quote() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_booking_quote(uuid, date, date, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_package_quote(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_provider_bookings() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_booking(uuid, date, date, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_package_booking(uuid, date, date, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_cart_order(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cart_total() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cart_quote() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_quote(uuid, date, date, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_package_quote(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_provider_bookings() TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 6) NO cambian (revisadas): provider_set_booking_status (solo actualiza status) y get_booking_for_provider_action
--    (solo lee total_price para el reembolso: el reembolso devuelve lo que se pagó por esa reserva = su total_price repartido).
--
-- VERIFICACIÓN TRAS APLICAR (sin cobrar nada; sustituir ids reales y ejecutar como un usuario autenticado):
--   SELECT * FROM get_booking_quote('<listing_id>', CURRENT_DATE + 7, CURRENT_DATE + 7, 1);
--     -- Equipo de $80 (8000): subtotal 9200, service_fee 499, total 9699.
--   SELECT * FROM get_cart_quote();   -- con items en el carrito
-- ─────────────────────────────────────────────────────────────────────────

COMMIT;
