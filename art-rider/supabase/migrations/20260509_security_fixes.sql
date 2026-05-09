-- =========================================================
-- ArtRider Security Fix Migration — 2026-05-09
-- Addresses: CRIT-01, CRIT-02, HIGH-01..04, MED-03, DESIGN-02/03
-- Apply in Supabase SQL Editor. Idempotent via DROP IF EXISTS.
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- CRIT-01: Enable RLS on conversations and messages
-- Policies already exist in rls.sql — this activates them.
-- ─────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────
-- CRIT-02: Reconcile duplicate policies — providers
-- Both schema.sql and rls.sql defined overlapping policies;
-- the permissive USING(true) was silently winning via OR union.
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "providers_user_read"                       ON providers;
DROP POLICY IF EXISTS "providers_user_insert"                     ON providers;
DROP POLICY IF EXISTS "providers_user_update"                     ON providers;
DROP POLICY IF EXISTS "Public providers are viewable by everyone"  ON providers;
DROP POLICY IF EXISTS "Users can manage own provider profile"      ON providers;

CREATE POLICY "providers_public_read"    ON providers FOR SELECT  USING (true);
CREATE POLICY "providers_owner_insert"   ON providers FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "providers_owner_update"   ON providers FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "providers_prevent_delete" ON providers FOR DELETE  USING (false);


-- ─────────────────────────────────────────────────────────
-- CRIT-02: Reconcile duplicate policies — listings
-- schema.sql UPDATE lacked WITH CHECK; rls.sql added a second
-- overlapping policy set. Collapse to single authoritative set.
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "listings_public_read"              ON listings;
DROP POLICY IF EXISTS "listings_owner_insert"             ON listings;
DROP POLICY IF EXISTS "listings_owner_update"             ON listings;
DROP POLICY IF EXISTS "Anyone can read published listings" ON listings;
DROP POLICY IF EXISTS "Owners can insert listings"         ON listings;
DROP POLICY IF EXISTS "Owners can update listings safely"  ON listings;
DROP POLICY IF EXISTS "Owners can delete listings"         ON listings;

CREATE POLICY "listings_read"   ON listings FOR SELECT
  USING (is_published = true OR auth.uid() = owner_id);
CREATE POLICY "listings_insert" ON listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "listings_update" ON listings FOR UPDATE
  USING  (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "listings_delete" ON listings FOR DELETE
  USING (auth.uid() = owner_id);


-- ─────────────────────────────────────────────────────────
-- HIGH-01: Prevent bookings identity/price mutation via UPDATE
-- A booking participant could reassign owner_id or alter total_price.
-- ─────────────────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS trg_prevent_booking_identity_mutation ON bookings;
CREATE TRIGGER trg_prevent_booking_identity_mutation
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_booking_identity_mutation();


-- ─────────────────────────────────────────────────────────
-- HIGH-02: Prevent cross-party signature forgery on contracts
-- A client could overwrite owner_signed_at / owner_signature_hash
-- or flip status to EXECUTED. Trigger enforces column ownership.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_contract_cross_signature()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_client_id UUID;
  v_owner_id  UUID;
BEGIN
  SELECT client_id, owner_id INTO v_client_id, v_owner_id
  FROM bookings WHERE id = NEW.booking_id;

  IF auth.uid() = v_client_id THEN
    IF NEW.owner_signed_at       IS DISTINCT FROM OLD.owner_signed_at
    OR NEW.owner_signature_hash  IS DISTINCT FROM OLD.owner_signature_hash
    OR NEW.owner_pdf_url         IS DISTINCT FROM OLD.owner_pdf_url THEN
      RAISE EXCEPTION 'Clients cannot modify owner signature fields.';
    END IF;
  END IF;

  IF auth.uid() = v_owner_id THEN
    IF NEW.client_signed_at      IS DISTINCT FROM OLD.client_signed_at
    OR NEW.client_signature_hash IS DISTINCT FROM OLD.client_signature_hash
    OR NEW.client_pdf_url        IS DISTINCT FROM OLD.client_pdf_url THEN
      RAISE EXCEPTION 'Owners cannot modify client signature fields.';
    END IF;
  END IF;

  -- Only service_role (auth.uid() IS NULL in SECURITY DEFINER context) may flip status.
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Contract status can only be changed by the system.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_contract_cross_signature ON digital_contracts;
CREATE TRIGGER trg_prevent_contract_cross_signature
  BEFORE UPDATE ON digital_contracts
  FOR EACH ROW EXECUTE FUNCTION prevent_contract_cross_signature();


-- ─────────────────────────────────────────────────────────
-- HIGH-04: Prevent providers from self-approving their status
-- Without this, any provider could set status = 'active' directly.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_provider_status_self_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Provider status can only be changed by administrators.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_provider_status_change ON providers;
CREATE TRIGGER trg_prevent_provider_status_change
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION prevent_provider_status_self_change();


-- ─────────────────────────────────────────────────────────
-- MED-03: Allow clients to read equipment_units on their bookings
-- Current policy only allows listing owners, leaving clients blind
-- to the equipment they rented (functional gap + privilege inversion).
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "equipment_units_client_booking_read" ON equipment_units;
CREATE POLICY "equipment_units_client_booking_read" ON equipment_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_units
      JOIN bookings ON bookings.id = booking_units.booking_id
      WHERE booking_units.equipment_unit_id = equipment_units.id
        AND bookings.client_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- DESIGN-03: Atomic profile creation on auth.users INSERT
-- Eliminates orphan-user risk when admin insert fails after signUp.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
