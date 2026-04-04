-- =========================================================
-- Migration: 001_product_catalog_anon_read
-- Purpose:   Allow anonymous (unauthenticated) users to read
--            the product_catalog table so that public listing
--            queries can JOIN catalog data without requiring auth.
--
-- Context:   The /listings and /listings/[id] routes are fully
--            public. The existing "Public read for authenticated
--            users" policy blocked anonymous joins, which would
--            return null for product_catalog on every public
--            listing query.
--
-- Safety:    product_catalog is a read-only master catalog
--            (INSERT/UPDATE/DELETE are all blocked for non-admins
--            by existing policies). Exposing SELECT to anon is
--            safe — no sensitive data lives in this table.
-- =========================================================

CREATE POLICY "Public read for anon users"
  ON product_catalog
  FOR SELECT
  TO anon
  USING (true);
