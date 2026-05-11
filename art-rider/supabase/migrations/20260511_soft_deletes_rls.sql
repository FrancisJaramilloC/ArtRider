-- =========================================================
-- ArtRider Security Fix Migration — 2026-05-11
-- Enforces Soft Deletes (deleted_at IS NULL) on all SELECT RLS policies
-- =========================================================

-- (La tabla PROFILES ha sido excluida de este cambio a petición)

-- ─────────────────────────────────────────────────────────
-- 2. ADDRESSES
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own addresses" ON addresses;

CREATE POLICY "Users can read own addresses" ON addresses FOR SELECT 
  USING (auth.uid() = user_id AND deleted_at IS NULL);


-- ─────────────────────────────────────────────────────────
-- 3. LISTINGS
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "listings_read" ON listings;
DROP POLICY IF EXISTS "listings_public_read" ON listings;

-- Notice: we use provider_id logic as defined in schema.sql but safely structured.
CREATE POLICY "listings_read" ON listings FOR SELECT
  USING ((is_published = true OR is_my_provider(provider_id)) AND deleted_at IS NULL);


-- ─────────────────────────────────────────────────────────
-- 4. PACKAGES
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "packages_owner_read" ON packages;

CREATE POLICY "packages_owner_read" ON packages FOR SELECT
  USING ((is_published = true OR is_my_provider(provider_id)) AND deleted_at IS NULL);

-- ─────────────────────────────────────────────────────────
-- 5. PACKAGE ITEMS (Cascade visibility)
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "package_items_read" ON package_items;

-- Re-create but ensuring the parent package is not deleted
CREATE POLICY "package_items_read" ON package_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM packages p
    WHERE p.id = package_id AND (p.is_published = true OR is_my_provider(p.provider_id)) AND p.deleted_at IS NULL
  ));
