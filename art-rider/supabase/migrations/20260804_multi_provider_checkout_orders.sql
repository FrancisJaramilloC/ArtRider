-- =========================================================
-- Multi-provider cart orders with a single Kushki charge
-- One checkout_order groups one booking per provider.
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS checkout_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'PAID'
    CHECK (status IN ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REFUND_FAILED')),
  source TEXT NOT NULL DEFAULT 'standard'
    CHECK (source IN ('standard', 'advisory')),
  advisory_proposal_id UUID,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  service_fee INTEGER NOT NULL CHECK (service_fee >= 0),
  total_price INTEGER NOT NULL CHECK (total_price > 0),
  kushki_ticket TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  refund_attempted_at TIMESTAMPTZ,
  refund_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_date <= end_date),
  CHECK (subtotal + service_fee = total_price),
  CHECK (refunded_amount <= total_price)
);

ALTER TABLE checkout_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkout_orders_client_read" ON checkout_orders;
CREATE POLICY "checkout_orders_client_read" ON checkout_orders
  FOR SELECT USING (auth.uid() = client_id);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS checkout_order_id UUID REFERENCES checkout_orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_checkout_orders_client_created
  ON checkout_orders(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_checkout_order
  ON bookings(checkout_order_id) WHERE checkout_order_id IS NOT NULL;

-- The function is service-role only. It validates the sanitized payload again,
-- locks equipment units, and creates the complete order atomically.
CREATE OR REPLACE FUNCTION create_multi_provider_checkout(
  p_client_id UUID,
  p_kushki_ticket TEXT,
  p_source TEXT,
  p_advisory_proposal_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_subtotal INTEGER,
  p_service_fee INTEGER,
  p_total INTEGER,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_booking_id UUID;
  v_provider_id UUID;
  v_listing_id UUID;
  v_unit_id UUID;
  v_item JSONB;
  v_quantity INTEGER;
  v_unit_price INTEGER;
  v_line_subtotal INTEGER;
  v_provider_subtotal INTEGER;
  v_provider_fee INTEGER;
  v_allocated_fee INTEGER := 0;
  v_provider_index INTEGER := 0;
  v_provider_count INTEGER;
  v_booking_ids JSONB := '[]'::JSONB;
  v_listing_provider UUID;
  v_listing_price INTEGER;
  v_listing_published BOOLEAN;
  v_listing_deleted TIMESTAMPTZ;
  v_expected_subtotal INTEGER;
  v_i INTEGER;
BEGIN
  IF p_client_id IS NULL OR p_kushki_ticket IS NULL OR p_kushki_ticket = '' THEN
    RAISE EXCEPTION 'Client and Kushki ticket are required.';
  END IF;
  IF p_source NOT IN ('standard', 'advisory') THEN
    RAISE EXCEPTION 'Invalid checkout source.';
  END IF;
  IF p_start_date > p_end_date OR p_total <= 0 OR p_subtotal < 0 OR p_service_fee < 0 THEN
    RAISE EXCEPTION 'Invalid checkout totals or dates.';
  END IF;
  IF p_subtotal + p_service_fee <> p_total THEN
    RAISE EXCEPTION 'Checkout totals do not reconcile.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Checkout requires at least one item.';
  END IF;

  SELECT COALESCE(SUM((item->>'line_subtotal')::INTEGER), 0)
    INTO v_expected_subtotal
  FROM jsonb_array_elements(p_items) item;
  IF v_expected_subtotal <> p_subtotal THEN
    RAISE EXCEPTION 'Item subtotal does not match checkout subtotal.';
  END IF;

  INSERT INTO checkout_orders (
    client_id, source, advisory_proposal_id, start_date, end_date,
    subtotal, service_fee, total_price, kushki_ticket, items
  ) VALUES (
    p_client_id, p_source, p_advisory_proposal_id, p_start_date, p_end_date,
    p_subtotal, p_service_fee, p_total, p_kushki_ticket, p_items
  ) RETURNING id INTO v_order_id;

  SELECT COUNT(DISTINCT (item->>'provider_id')::UUID)
    INTO v_provider_count
  FROM jsonb_array_elements(p_items) item;

  FOR v_provider_id IN
    SELECT DISTINCT (item->>'provider_id')::UUID
    FROM jsonb_array_elements(p_items) item
  LOOP
    v_provider_index := v_provider_index + 1;

    SELECT COALESCE(SUM((item->>'line_subtotal')::INTEGER), 0)
      INTO v_provider_subtotal
    FROM jsonb_array_elements(p_items) item
    WHERE (item->>'provider_id')::UUID = v_provider_id;

    IF v_provider_index = v_provider_count THEN
      v_provider_fee := p_service_fee - v_allocated_fee;
    ELSE
      v_provider_fee := ROUND(
        p_service_fee::NUMERIC * v_provider_subtotal::NUMERIC / NULLIF(p_subtotal, 0)
      )::INTEGER;
      v_allocated_fee := v_allocated_fee + v_provider_fee;
    END IF;

    INSERT INTO bookings (
      client_id, provider_id, status, start_date, end_date,
      total_price, checkout_order_id, snapshot_listing
    ) VALUES (
      p_client_id, v_provider_id, 'AWAITING_SIGNATURES', p_start_date, p_end_date,
      v_provider_subtotal + v_provider_fee, v_order_id,
      jsonb_build_object(
        'cart_items', (
          SELECT jsonb_agg(item)
          FROM jsonb_array_elements(p_items) item
          WHERE (item->>'provider_id')::UUID = v_provider_id
        )
      )
    ) RETURNING id INTO v_booking_id;

    v_booking_ids := v_booking_ids || jsonb_build_array(v_booking_id);

    FOR v_item IN
      SELECT item
      FROM jsonb_array_elements(p_items) item
      WHERE (item->>'provider_id')::UUID = v_provider_id
    LOOP
      v_listing_id := (v_item->>'listing_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
      v_unit_price := (v_item->>'unit_price')::INTEGER;
      v_line_subtotal := (v_item->>'line_subtotal')::INTEGER;

      IF v_quantity < 1 OR v_quantity > 20 OR v_unit_price < 0 OR v_line_subtotal < 0 THEN
        RAISE EXCEPTION 'Invalid item values for listing %.', v_listing_id;
      END IF;
      IF v_line_subtotal <> v_unit_price * v_quantity * (p_end_date - p_start_date + 1) THEN
        RAISE EXCEPTION 'Invalid line subtotal for listing %.', v_listing_id;
      END IF;

      SELECT provider_id, daily_price, is_published, deleted_at
        INTO v_listing_provider, v_listing_price, v_listing_published, v_listing_deleted
      FROM listings
      WHERE id = v_listing_id;

      IF v_listing_provider IS DISTINCT FROM v_provider_id
        OR v_listing_published IS NOT TRUE
        OR v_listing_deleted IS NOT NULL THEN
        RAISE EXCEPTION 'Listing % is unavailable or belongs to another provider.', v_listing_id;
      END IF;
      IF p_source = 'standard' AND v_listing_price <> v_unit_price THEN
        RAISE EXCEPTION 'Listing % price changed.', v_listing_id;
      END IF;

      FOR v_i IN 1..v_quantity LOOP
        SELECT eu.id INTO v_unit_id
        FROM equipment_units eu
        WHERE eu.listing_id = v_listing_id
          AND eu.internal_status = 'AVAILABLE'
          AND NOT EXISTS (
            SELECT 1
            FROM booking_units bu
            JOIN bookings b ON b.id = bu.booking_id
            WHERE bu.equipment_unit_id = eu.id
              AND b.status NOT IN ('CANCELLED', 'ARCHIVED')
              AND b.start_date <= p_end_date
              AND b.end_date >= p_start_date
          )
          AND NOT EXISTS (
            SELECT 1
            FROM availability_calendar ac
            WHERE ac.equipment_unit_id = eu.id
              AND ac.start_date <= p_end_date
              AND ac.end_date >= p_start_date
          )
        ORDER BY eu.created_at, eu.id
        FOR UPDATE OF eu SKIP LOCKED
        LIMIT 1;

        IF v_unit_id IS NULL THEN
          RAISE EXCEPTION 'Insufficient availability for listing %.', v_listing_id;
        END IF;

        INSERT INTO booking_units (booking_id, equipment_unit_id, locked_daily_price)
        VALUES (v_booking_id, v_unit_id, v_unit_price);
        v_unit_id := NULL;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id, 'booking_ids', v_booking_ids);
END;
$$;

REVOKE ALL ON FUNCTION create_multi_provider_checkout(
  UUID, TEXT, TEXT, UUID, DATE, DATE, INTEGER, INTEGER, INTEGER, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_multi_provider_checkout(
  UUID, TEXT, TEXT, UUID, DATE, DATE, INTEGER, INTEGER, INTEGER, JSONB
) TO service_role;

COMMIT;
