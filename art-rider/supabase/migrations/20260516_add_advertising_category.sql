-- =========================================================
-- Add 'advertising' to listings.category CHECK constraint
-- Missing from schema.sql but used in all frontend category pickers.
-- =========================================================

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_category_check
  CHECK (category IN ('audio', 'lighting', 'video', 'effects', 'advertising', 'other'));
