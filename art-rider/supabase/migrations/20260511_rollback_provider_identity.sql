-- =========================================================
-- ROLLBACK: Provider Identity Consolidation
-- USE ONLY IF the forward migration fails or needs reverting.
-- Execute in Supabase SQL Editor.
-- =========================================================

BEGIN;

-- ── 1. Drop new indexes ──
DROP INDEX IF EXISTS idx_listings_provider_id;
DROP INDEX IF EXISTS idx_bookings_provider_id;
DROP INDEX IF EXISTS idx_packages_provider_id;

-- ── 2. Restore packages policies ──
DROP POLICY IF EXISTS "packages_read"   ON packages;
DROP POLICY IF EXISTS "packages_insert" ON packages;
DROP POLICY IF EXISTS "packages_update" ON packages;

-- ── 3. Restore messages & conversations policies ──
DROP POLICY IF EXISTS "messages_read"        ON messages;
DROP POLICY IF EXISTS "messages_insert"      ON messages;
DROP POLICY IF EXISTS "conversations_read"   ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

-- ── 4. Restore contracts & payments policies ──
DROP POLICY IF EXISTS "contracts_read"   ON digital_contracts;
DROP POLICY IF EXISTS "contracts_update" ON digital_contracts;
DROP POLICY IF EXISTS "payments_read"    ON payments;

-- ── 5. Restore availability_calendar policies ──
DROP POLICY IF EXISTS "availability_public_read"      ON availability_calendar;
DROP POLICY IF EXISTS "availability_provider_insert"   ON availability_calendar;
DROP POLICY IF EXISTS "availability_provider_update"   ON availability_calendar;
DROP POLICY IF EXISTS "availability_provider_delete"   ON availability_calendar;

-- ── 6. Restore booking_units policies ──
DROP POLICY IF EXISTS "booking_units_read"             ON booking_units;
DROP POLICY IF EXISTS "booking_units_provider_insert"   ON booking_units;
DROP POLICY IF EXISTS "booking_units_provider_update"   ON booking_units;
DROP POLICY IF EXISTS "booking_units_provider_delete"   ON booking_units;

-- ── 7. Restore bookings policies ──
DROP POLICY IF EXISTS "bookings_read"            ON bookings;
DROP POLICY IF EXISTS "bookings_insert"          ON bookings;
DROP POLICY IF EXISTS "bookings_update"          ON bookings;
DROP POLICY IF EXISTS "bookings_prevent_delete"  ON bookings;

-- ── 8. Restore equipment_units policies ──
DROP POLICY IF EXISTS "equipment_units_provider_read"   ON equipment_units;
DROP POLICY IF EXISTS "equipment_units_provider_insert" ON equipment_units;
DROP POLICY IF EXISTS "equipment_units_provider_update" ON equipment_units;
DROP POLICY IF EXISTS "equipment_units_provider_delete" ON equipment_units;

-- ── 9. Restore listings policies ──
DROP POLICY IF EXISTS "listings_read"   ON listings;
DROP POLICY IF EXISTS "listings_insert" ON listings;
DROP POLICY IF EXISTS "listings_update" ON listings;
DROP POLICY IF EXISTS "listings_delete" ON listings;

-- ── 10. Drop helper function ──
DROP FUNCTION IF EXISTS is_my_provider(UUID);

-- ── 11. Rename columns back & restore FKs ──

-- listings
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_provider_id_fkey;
ALTER TABLE listings RENAME COLUMN provider_id TO owner_id;
ALTER TABLE listings
  ADD CONSTRAINT listings_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_provider_id_fkey;
ALTER TABLE bookings RENAME COLUMN provider_id TO owner_id;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id);

-- packages
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_provider_id_fkey;
ALTER TABLE packages RENAME COLUMN provider_id TO owner_id;
ALTER TABLE packages
  ADD CONSTRAINT packages_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ── 12. Restore original policies (from security_fixes migration) ──

CREATE POLICY "listings_read" ON listings FOR SELECT
  USING (is_published = true OR auth.uid() = owner_id);
CREATE POLICY "listings_insert" ON listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "listings_update" ON listings FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "listings_delete" ON listings FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Bookings visible to client and owner" ON bookings FOR SELECT
  USING (auth.uid() IN (client_id, owner_id));
CREATE POLICY "Only client can insert bookings" ON bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Client and owner can update bookings safely" ON bookings FOR UPDATE
  USING (auth.uid() IN (client_id, owner_id)) WITH CHECK (auth.uid() IN (client_id, owner_id));
CREATE POLICY "Prevent delete bookings" ON bookings FOR DELETE
  USING (false);

CREATE POLICY "Listing owners can view units" ON equipment_units FOR SELECT
  USING (EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND listings.owner_id = auth.uid()));
CREATE POLICY "Listing owners can insert units" ON equipment_units FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND listings.owner_id = auth.uid()));
CREATE POLICY "Listing owners can update units safely" ON equipment_units FOR UPDATE
  USING (EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND listings.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND listings.owner_id = auth.uid()));
CREATE POLICY "Listing owners can delete units" ON equipment_units FOR DELETE
  USING (EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND listings.owner_id = auth.uid()));

CREATE POLICY "Booking units visible to client and owner" ON booking_units FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));
CREATE POLICY "Only owner can insert booking units" ON booking_units FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.owner_id = auth.uid()));
CREATE POLICY "Only owner can update booking units safely" ON booking_units FOR UPDATE
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND bookings.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.owner_id = auth.uid()));
CREATE POLICY "Only owner can delete booking units" ON booking_units FOR DELETE
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND bookings.owner_id = auth.uid()));

CREATE POLICY "Users can read availability" ON availability_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can insert availability" ON availability_calendar FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM equipment_units JOIN listings ON equipment_units.listing_id = listings.id WHERE equipment_units.id = availability_calendar.equipment_unit_id AND listings.owner_id = auth.uid()));
CREATE POLICY "Owners can update availability safely" ON availability_calendar FOR UPDATE
  USING (EXISTS (SELECT 1 FROM equipment_units JOIN listings ON equipment_units.listing_id = listings.id WHERE equipment_units.id = availability_calendar.equipment_unit_id AND listings.owner_id = auth.uid()));
CREATE POLICY "Owners can delete availability" ON availability_calendar FOR DELETE
  USING (EXISTS (SELECT 1 FROM equipment_units JOIN listings ON equipment_units.listing_id = listings.id WHERE equipment_units.id = availability_calendar.equipment_unit_id AND listings.owner_id = auth.uid()));

CREATE POLICY "Payments visible to client and owner" ON payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));

CREATE POLICY "Contracts visible to client and owner" ON digital_contracts FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = digital_contracts.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));
CREATE POLICY "Contracts updatable safely by both parties" ON digital_contracts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = digital_contracts.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));

CREATE POLICY "Conversations visible to participants" ON conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = conversations.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));
CREATE POLICY "Participants can explicitly insert conversations" ON conversations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));
CREATE POLICY "Participants can update conversations safely" ON conversations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = conversations.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));

CREATE POLICY "Messages visible to conversation participants" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations JOIN bookings ON conversations.booking_id = bookings.id WHERE conversations.id = messages.conversation_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));
CREATE POLICY "Participants can insert own messages securely" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM conversations JOIN bookings ON conversations.booking_id = bookings.id WHERE conversations.id = conversation_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)));

-- ── 13. Restore original triggers ──
CREATE OR REPLACE FUNCTION prevent_booking_identity_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client_id is immutable on bookings.';
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id is immutable on bookings.';
  END IF;
  IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    RAISE EXCEPTION 'total_price is immutable on bookings.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_contract_cross_signature()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_client_id UUID;
  v_owner_id  UUID;
BEGIN
  SELECT client_id, owner_id INTO v_client_id, v_owner_id
  FROM bookings WHERE id = NEW.booking_id;

  IF auth.uid() = v_client_id THEN
    IF NEW.owner_signed_at IS DISTINCT FROM OLD.owner_signed_at
    OR NEW.owner_signature_hash IS DISTINCT FROM OLD.owner_signature_hash
    OR NEW.owner_pdf_url IS DISTINCT FROM OLD.owner_pdf_url THEN
      RAISE EXCEPTION 'Clients cannot modify owner signature fields.';
    END IF;
  END IF;

  IF auth.uid() = v_owner_id THEN
    IF NEW.client_signed_at IS DISTINCT FROM OLD.client_signed_at
    OR NEW.client_signature_hash IS DISTINCT FROM OLD.client_signature_hash
    OR NEW.client_pdf_url IS DISTINCT FROM OLD.client_pdf_url THEN
      RAISE EXCEPTION 'Owners cannot modify client signature fields.';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Contract status can only be changed by the system.';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
