-- =========================================================
-- ArtRider — Provider Identity Consolidation
-- Migration: 2026-05-11
--
-- PURPOSE: Enforce that only providers (not generic profiles)
-- can own listings, receive bookings, and own packages.
--
-- CHANGES:
--   1. Rename owner_id → provider_id on listings, bookings, packages
--   2. Re-point foreign keys from profiles(id) → providers(id)
--   3. Recreate all affected RLS policies with provider subquery
--   4. Update immutability trigger on bookings
-- =========================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- PHASE 1: RENAME COLUMNS & RE-POINT FOREIGN KEYS
-- ─────────────────────────────────────────────────────────

-- ── listings ──
ALTER TABLE listings RENAME COLUMN owner_id TO provider_id;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_owner_id_fkey;
ALTER TABLE listings
  ADD CONSTRAINT listings_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

-- ── bookings ──
ALTER TABLE bookings RENAME COLUMN owner_id TO provider_id;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_owner_id_fkey;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id);

-- ── packages ──
ALTER TABLE packages RENAME COLUMN owner_id TO provider_id;
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_owner_id_fkey;
ALTER TABLE packages
  ADD CONSTRAINT packages_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;


-- ─────────────────────────────────────────────────────────
-- PHASE 2: HELPER FUNCTION
-- Reusable check: does auth.uid() own this provider record?
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_my_provider(p_provider_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = p_provider_id
      AND providers.user_id = auth.uid()
  );
$$;


-- ─────────────────────────────────────────────────────────
-- PHASE 3: RECREATE LISTINGS RLS POLICIES
-- ─────────────────────────────────────────────────────────

-- Drop all existing listings policies (from schema.sql + security_fixes)
DROP POLICY IF EXISTS "listings_read"   ON listings;
DROP POLICY IF EXISTS "listings_insert" ON listings;
DROP POLICY IF EXISTS "listings_update" ON listings;
DROP POLICY IF EXISTS "listings_delete" ON listings;
DROP POLICY IF EXISTS "listings_public_read"  ON listings;
DROP POLICY IF EXISTS "listings_owner_insert" ON listings;
DROP POLICY IF EXISTS "listings_owner_update" ON listings;

CREATE POLICY "listings_read" ON listings FOR SELECT
  USING (is_published = true OR is_my_provider(provider_id));

CREATE POLICY "listings_insert" ON listings FOR INSERT
  WITH CHECK (is_my_provider(provider_id));

CREATE POLICY "listings_update" ON listings FOR UPDATE
  USING  (is_my_provider(provider_id))
  WITH CHECK (is_my_provider(provider_id));

CREATE POLICY "listings_delete" ON listings FOR DELETE
  USING (is_my_provider(provider_id));


-- ─────────────────────────────────────────────────────────
-- PHASE 4: RECREATE EQUIPMENT_UNITS RLS POLICIES
-- These JOIN through listings.provider_id
-- ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Listing owners can view units"         ON equipment_units;
DROP POLICY IF EXISTS "Listing owners can insert units"       ON equipment_units;
DROP POLICY IF EXISTS "Listing owners can update units safely" ON equipment_units;
DROP POLICY IF EXISTS "Listing owners can delete units"       ON equipment_units;

CREATE POLICY "equipment_units_provider_read" ON equipment_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = equipment_units.listing_id
        AND is_my_provider(listings.provider_id)
    )
  );

CREATE POLICY "equipment_units_provider_insert" ON equipment_units FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_id
        AND is_my_provider(listings.provider_id)
    )
  );

CREATE POLICY "equipment_units_provider_update" ON equipment_units FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = equipment_units.listing_id
        AND is_my_provider(listings.provider_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_id
        AND is_my_provider(listings.provider_id)
    )
  );

CREATE POLICY "equipment_units_provider_delete" ON equipment_units FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = equipment_units.listing_id
        AND is_my_provider(listings.provider_id)
    )
  );

-- Keep the client booking read policy (unchanged, no owner_id ref)
-- "equipment_units_client_booking_read" stays as-is


-- ─────────────────────────────────────────────────────────
-- PHASE 5: RECREATE BOOKINGS RLS POLICIES
-- provider_id now references providers(id), so we need
-- is_my_provider() for the provider side
-- ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Bookings visible to client and owner"          ON bookings;
DROP POLICY IF EXISTS "Only client can insert bookings"                ON bookings;
DROP POLICY IF EXISTS "Client and owner can update bookings safely"    ON bookings;
DROP POLICY IF EXISTS "Prevent delete bookings"                        ON bookings;

CREATE POLICY "bookings_read" ON bookings FOR SELECT
  USING (auth.uid() = client_id OR is_my_provider(provider_id));

CREATE POLICY "bookings_insert" ON bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "bookings_update" ON bookings FOR UPDATE
  USING  (auth.uid() = client_id OR is_my_provider(provider_id))
  WITH CHECK (auth.uid() = client_id OR is_my_provider(provider_id));

CREATE POLICY "bookings_prevent_delete" ON bookings FOR DELETE
  USING (false);


-- ─────────────────────────────────────────────────────────
-- PHASE 6: RECREATE BOOKING_UNITS RLS POLICIES
-- ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Booking units visible to client and owner"  ON booking_units;
DROP POLICY IF EXISTS "Only owner can insert booking units"         ON booking_units;
DROP POLICY IF EXISTS "Only owner can update booking units safely"  ON booking_units;
DROP POLICY IF EXISTS "Only owner can delete booking units"         ON booking_units;

CREATE POLICY "booking_units_read" ON booking_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_units.booking_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

CREATE POLICY "booking_units_provider_insert" ON booking_units FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
        AND is_my_provider(bookings.provider_id)
    )
  );

CREATE POLICY "booking_units_provider_update" ON booking_units FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_units.booking_id
        AND is_my_provider(bookings.provider_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
        AND is_my_provider(bookings.provider_id)
    )
  );

CREATE POLICY "booking_units_provider_delete" ON booking_units FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_units.booking_id
        AND is_my_provider(bookings.provider_id)
    )
  );


-- ─────────────────────────────────────────────────────────
-- PHASE 7: RECREATE AVAILABILITY_CALENDAR RLS POLICIES
-- ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can read availability"        ON availability_calendar;
DROP POLICY IF EXISTS "Owners can insert availability"     ON availability_calendar;
DROP POLICY IF EXISTS "Owners can update availability safely" ON availability_calendar;
DROP POLICY IF EXISTS "Owners can delete availability"     ON availability_calendar;

CREATE POLICY "availability_public_read" ON availability_calendar FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "availability_provider_insert" ON availability_calendar FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM equipment_units
      JOIN listings ON equipment_units.listing_id = listings.id
      WHERE equipment_units.id = availability_calendar.equipment_unit_id
        AND is_my_provider(listings.provider_id)
    )
  );

CREATE POLICY "availability_provider_update" ON availability_calendar FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM equipment_units
      JOIN listings ON equipment_units.listing_id = listings.id
      WHERE equipment_units.id = availability_calendar.equipment_unit_id
        AND is_my_provider(listings.provider_id)
    )
  );

CREATE POLICY "availability_provider_delete" ON availability_calendar FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM equipment_units
      JOIN listings ON equipment_units.listing_id = listings.id
      WHERE equipment_units.id = availability_calendar.equipment_unit_id
        AND is_my_provider(listings.provider_id)
    )
  );


-- ─────────────────────────────────────────────────────────
-- PHASE 8: RECREATE PAYMENTS, CONTRACTS, CONVERSATIONS,
--          MESSAGES RLS POLICIES (bookings.owner_id → provider_id)
-- ─────────────────────────────────────────────────────────

-- ── Payments ──
DROP POLICY IF EXISTS "Payments visible to client and owner" ON payments;
CREATE POLICY "payments_read" ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

-- ── Digital Contracts ──
DROP POLICY IF EXISTS "Contracts visible to client and owner"         ON digital_contracts;
DROP POLICY IF EXISTS "Contracts updatable safely by both parties"    ON digital_contracts;

CREATE POLICY "contracts_read" ON digital_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = digital_contracts.booking_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

CREATE POLICY "contracts_update" ON digital_contracts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = digital_contracts.booking_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

-- ── Conversations ──
DROP POLICY IF EXISTS "Conversations visible to participants"                  ON conversations;
DROP POLICY IF EXISTS "Participants can explicitly insert conversations"       ON conversations;
DROP POLICY IF EXISTS "Participants can update conversations safely"           ON conversations;

CREATE POLICY "conversations_read" ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = conversations.booking_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = conversations.booking_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

-- ── Messages ──
DROP POLICY IF EXISTS "Messages visible to conversation participants"     ON messages;
DROP POLICY IF EXISTS "Participants can insert own messages securely"     ON messages;

CREATE POLICY "messages_read" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN bookings ON conversations.booking_id = bookings.id
      WHERE conversations.id = messages.conversation_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      JOIN bookings ON conversations.booking_id = bookings.id
      WHERE conversations.id = conversation_id
        AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );


-- ─────────────────────────────────────────────────────────
-- PHASE 9: RECREATE PACKAGES RLS POLICIES
-- ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "packages_public_read"    ON packages;
DROP POLICY IF EXISTS "packages_owner_insert"   ON packages;
DROP POLICY IF EXISTS "packages_owner_update"   ON packages;

CREATE POLICY "packages_read" ON packages FOR SELECT
  USING (is_published = true OR is_my_provider(provider_id));

CREATE POLICY "packages_insert" ON packages FOR INSERT
  WITH CHECK (is_my_provider(provider_id));

CREATE POLICY "packages_update" ON packages FOR UPDATE
  USING  (is_my_provider(provider_id))
  WITH CHECK (is_my_provider(provider_id));


-- ─────────────────────────────────────────────────────────
-- PHASE 10: UPDATE BOOKING IMMUTABILITY TRIGGER
-- Rename owner_id → provider_id in the guard function
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_booking_identity_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client_id is immutable on bookings.';
  END IF;
  IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
    RAISE EXCEPTION 'provider_id is immutable on bookings.';
  END IF;
  IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    RAISE EXCEPTION 'total_price is immutable on bookings.';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger already exists, function replacement is enough.


-- ─────────────────────────────────────────────────────────
-- PHASE 11: UPDATE CONTRACT CROSS-SIGNATURE TRIGGER
-- References bookings.owner_id → provider_id
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_contract_cross_signature()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_client_id   UUID;
  v_provider_id UUID;
  v_user_id     UUID;
BEGIN
  SELECT client_id, provider_id INTO v_client_id, v_provider_id
  FROM bookings WHERE id = NEW.booking_id;

  -- Resolve provider's user_id for comparison with auth.uid()
  SELECT user_id INTO v_user_id
  FROM providers WHERE id = v_provider_id;

  IF auth.uid() = v_client_id THEN
    IF NEW.owner_signed_at       IS DISTINCT FROM OLD.owner_signed_at
    OR NEW.owner_signature_hash  IS DISTINCT FROM OLD.owner_signature_hash
    OR NEW.owner_pdf_url         IS DISTINCT FROM OLD.owner_pdf_url THEN
      RAISE EXCEPTION 'Clients cannot modify owner signature fields.';
    END IF;
  END IF;

  IF auth.uid() = v_user_id THEN
    IF NEW.client_signed_at      IS DISTINCT FROM OLD.client_signed_at
    OR NEW.client_signature_hash IS DISTINCT FROM OLD.client_signature_hash
    OR NEW.client_pdf_url        IS DISTINCT FROM OLD.client_pdf_url THEN
      RAISE EXCEPTION 'Owners cannot modify client signature fields.';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Contract status can only be changed by the system.';
  END IF;

  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
-- PHASE 12: INDEXES for new provider_id columns
-- ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_listings_provider_id ON listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_packages_provider_id ON packages(provider_id);


COMMIT;
