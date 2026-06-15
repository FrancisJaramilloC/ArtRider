-- Fix: Allow public read of addresses linked to published listings.
-- Root cause: the previous policy "Users can read own addresses" used
-- auth.uid() = user_id, which blocked any user other than the address
-- creator from reading it — including anonymous visitors on /listings.
--
-- This migration replaces that policy with one that also allows reading
-- addresses when they are referenced by a published, non-deleted listing.

DROP POLICY IF EXISTS "Users can read own addresses" ON addresses;

CREATE POLICY "addresses_select" ON addresses FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM listings
    WHERE listings.address_id = addresses.id
      AND listings.is_published = true
      AND listings.deleted_at IS NULL
  )
);
