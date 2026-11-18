-- NOTA: con el nuevo modelo de precios esta propuesta queda sustituida por get_provider_bookings (docs/PROPUESTA_PRECIOS_RPC.sql), que ya devuelve
-- partner_amount y rider_subtotal por reserva. Además la app móvil guarda los pedidos en `orders`, no en `checkout_orders`.

-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
--
-- Contexto: la pantalla «Ganancias» (solo lectura) hoy parte de la RPC get_provider_bookings, que devuelve
-- bookings.total_price (= subtotal de equipos + comisión de servicio asignada) pero NO el subtotal ni la comisión por
-- separado. La app los reconstruye con la misma función de comisión del checkout (5 %, redondeo hacia arriba), que es
-- exacta para pedidos de un solo Partner y puede variar unos centavos cuando la comisión de un pedido con varios Partners
-- se reparte proporcionalmente.
--
-- Esta función entrega el desglose EXACTO por reserva, solo para el Partner autenticado, sin tocar ninguna tabla.
-- Supuestos (verificar contra la base real; no pude consultarla):
--   * bookings.checkout_order_id → checkout_orders.items (JSONB) con 'provider_id' y 'line_subtotal' por línea
--     (así lo define la migración 20260804_multi_provider_checkout_orders.sql).
--   * Reservas anteriores a esa migración no tienen checkout_order_id: se estima el subtotal como total / 1.05.
--   * No existe en los datos un estado de «pago al Partner» (payout): «Pagada» en la app = reserva completada.

CREATE OR REPLACE FUNCTION public.get_provider_earnings()
RETURNS TABLE (
  booking_id uuid,
  status text,
  start_date date,
  end_date date,
  gross integer,        -- lo que pagó el Rider (bookings.total_price), en centavos
  subtotal integer,     -- parte del Partner (equipos), en centavos
  service_fee integer,  -- comisión de servicio incluida en el bruto, en centavos
  listing_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ),
  base AS (
    SELECT
      b.id,
      b.status::text AS status,
      b.start_date,
      b.end_date,
      b.total_price,
      b.checkout_order_id,
      b.provider_id,
      b.snapshot_listing
    FROM bookings b
    WHERE b.provider_id IN (SELECT id FROM me)
  )
  SELECT
    base.id,
    base.status,
    base.start_date,
    base.end_date,
    base.total_price AS gross,
    COALESCE(
      (
        SELECT SUM((i ->> 'line_subtotal')::integer)::integer
        FROM checkout_orders o
        CROSS JOIN LATERAL jsonb_array_elements(o.items) AS i
        WHERE o.id = base.checkout_order_id
          AND (i ->> 'provider_id')::uuid = base.provider_id
      ),
      ROUND(base.total_price / 1.05)::integer
    ) AS subtotal,
    base.total_price - COALESCE(
      (
        SELECT SUM((i ->> 'line_subtotal')::integer)::integer
        FROM checkout_orders o
        CROSS JOIN LATERAL jsonb_array_elements(o.items) AS i
        WHERE o.id = base.checkout_order_id
          AND (i ->> 'provider_id')::uuid = base.provider_id
      ),
      ROUND(base.total_price / 1.05)::integer
    ) AS service_fee,
    COALESCE(base.snapshot_listing ->> 'title', base.snapshot_listing -> 'cart_items' -> 0 ->> 'title') AS listing_title
  FROM base;
$$;

REVOKE ALL ON FUNCTION public.get_provider_earnings() FROM public;
GRANT EXECUTE ON FUNCTION public.get_provider_earnings() TO authenticated;
