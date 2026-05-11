-- =========================================================
-- MIGRATION: Unified Catalog Search View (Polymorphism)
-- Creates a VIEW that combines listings + packages for
-- unified search/discovery. No tables are modified.
-- Updated: 2026-05-11
-- =========================================================

CREATE OR REPLACE VIEW catalog_items AS
  -- Individual equipment listings
  SELECT
    id,
    'listing'::TEXT AS item_type,
    provider_id,
    title,
    category,
    cover_image_url,
    daily_price,
    description,
    is_published,
    created_at
  FROM listings
  WHERE deleted_at IS NULL

  UNION ALL

  -- Equipment packages
  SELECT
    id,
    'package'::TEXT AS item_type,
    provider_id,
    title,
    NULL::TEXT AS category,
    NULL::TEXT AS cover_image_url,
    daily_price,
    description,
    is_published,
    created_at
  FROM packages
  WHERE deleted_at IS NULL;

-- Grant read access to authenticated users
GRANT SELECT ON catalog_items TO authenticated;
