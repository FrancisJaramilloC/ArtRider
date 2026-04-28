-- =========================================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =========================================================

-- PACKAGES
CREATE TABLE IF NOT EXISTS packages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  daily_price     INTEGER NOT NULL,
  is_published    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages_owner_read"   ON packages FOR SELECT
  USING (auth.uid() = owner_id OR is_published = true);
CREATE POLICY "packages_owner_insert" ON packages FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "packages_owner_update" ON packages FOR UPDATE
  USING (auth.uid() = owner_id);
CREATE POLICY "packages_owner_delete" ON packages FOR DELETE
  USING (auth.uid() = owner_id);

-- PACKAGE_ITEMS  (which listings belong to a package)
CREATE TABLE IF NOT EXISTS package_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  UNIQUE(package_id, listing_id)
);

ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_items_read"   ON package_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM packages p
    WHERE p.id = package_id AND (p.owner_id = auth.uid() OR p.is_published = true)
  ));
CREATE POLICY "package_items_insert" ON package_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM packages p WHERE p.id = package_id AND p.owner_id = auth.uid()
  ));
CREATE POLICY "package_items_delete" ON package_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM packages p WHERE p.id = package_id AND p.owner_id = auth.uid()
  ));
