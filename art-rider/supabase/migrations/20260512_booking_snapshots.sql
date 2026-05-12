-- =========================================================
-- MIGRATION: Snapshot Histórico para Inmutabilidad de Contratos
-- Adds JSONB snapshot columns to bookings to preserve historical
-- data at booking creation time.
-- Updated: 2026-05-12
-- =========================================================

BEGIN;

-- ── 1. Add snapshot columns to bookings ──

-- Snapshot of listing data at time of booking
-- Captures: title, brand, model, category, daily_price, description, cover_image_url
ALTER TABLE bookings ADD COLUMN snapshot_listing JSONB;

-- Snapshot of the address where the equipment was located
-- Captures: line1, line2, city, state, postal_code, country, latitude, longitude
ALTER TABLE bookings ADD COLUMN snapshot_address JSONB;

-- Snapshot of provider info at time of booking
-- Captures: brand_name, contact info
ALTER TABLE bookings ADD COLUMN snapshot_provider JSONB;

-- ── 2. Add snapshot columns to digital_contracts ──

-- Full contract context frozen at signing time
ALTER TABLE digital_contracts ADD COLUMN snapshot_booking JSONB;

-- ── 3. Create trigger to auto-populate snapshots on booking insert ──

CREATE OR REPLACE FUNCTION populate_booking_snapshots()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing JSONB;
  v_address JSONB;
  v_provider JSONB;
  v_listing_id UUID;
  v_address_id UUID;
BEGIN
  -- Get listing_id from the first booking_unit (if exists via deferred insert)
  -- For now, we resolve from the booking_units that reference this booking.
  -- Since units may not exist yet at INSERT time, we look up via provider_id.

  -- Snapshot provider
  SELECT jsonb_build_object(
    'id', p.id,
    'brand_name', p.brand_name,
    'user_id', p.user_id
  ) INTO v_provider
  FROM providers p
  WHERE p.id = NEW.provider_id;

  NEW.snapshot_provider = v_provider;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_snapshot
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION populate_booking_snapshots();

-- ── 4. Create function to populate listing/address snapshots ──
-- Called after booking_units are inserted (since they link to listings)

CREATE OR REPLACE FUNCTION populate_booking_listing_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing JSONB;
  v_address JSONB;
  v_listing_record RECORD;
BEGIN
  -- Get listing data from the equipment unit
  SELECT l.id, l.title, l.brand, l.model, l.category, l.daily_price,
         l.description, l.cover_image_url, l.address_id
  INTO v_listing_record
  FROM equipment_units eu
  JOIN listings l ON l.id = eu.listing_id
  WHERE eu.id = NEW.equipment_unit_id;

  IF v_listing_record IS NOT NULL THEN
    v_listing = jsonb_build_object(
      'id', v_listing_record.id,
      'title', v_listing_record.title,
      'brand', v_listing_record.brand,
      'model', v_listing_record.model,
      'category', v_listing_record.category,
      'daily_price', v_listing_record.daily_price,
      'description', v_listing_record.description,
      'cover_image_url', v_listing_record.cover_image_url
    );

    -- Only update if snapshot is empty (first unit wins, don't overwrite)
    UPDATE bookings
    SET snapshot_listing = COALESCE(snapshot_listing, v_listing)
    WHERE id = NEW.booking_id AND snapshot_listing IS NULL;

    -- Snapshot address if available
    IF v_listing_record.address_id IS NOT NULL THEN
      SELECT jsonb_build_object(
        'line1', a.line1,
        'line2', a.line2,
        'city', a.city,
        'state', a.state,
        'postal_code', a.postal_code,
        'country', a.country,
        'latitude', a.latitude,
        'longitude', a.longitude
      ) INTO v_address
      FROM addresses a
      WHERE a.id = v_listing_record.address_id;

      UPDATE bookings
      SET snapshot_address = COALESCE(snapshot_address, v_address)
      WHERE id = NEW.booking_id AND snapshot_address IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_unit_snapshot
  AFTER INSERT ON booking_units
  FOR EACH ROW
  EXECUTE FUNCTION populate_booking_listing_snapshot();

-- ── 5. Make snapshot columns immutable ──

CREATE OR REPLACE FUNCTION prevent_snapshot_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.snapshot_listing IS NOT NULL AND NEW.snapshot_listing IS DISTINCT FROM OLD.snapshot_listing THEN
    RAISE EXCEPTION 'snapshot_listing is immutable once set.';
  END IF;
  IF OLD.snapshot_address IS NOT NULL AND NEW.snapshot_address IS DISTINCT FROM OLD.snapshot_address THEN
    RAISE EXCEPTION 'snapshot_address is immutable once set.';
  END IF;
  IF OLD.snapshot_provider IS NOT NULL AND NEW.snapshot_provider IS DISTINCT FROM OLD.snapshot_provider THEN
    RAISE EXCEPTION 'snapshot_provider is immutable once set.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_snapshot_mutation
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_snapshot_mutation();

COMMIT;
