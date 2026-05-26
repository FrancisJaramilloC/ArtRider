-- ─── Migration 002: Gallery images + Availability status ─────────────────────
-- Run in Supabase Dashboard → SQL Editor

-- Gallery images (up to 6 per listing/package; cover_image_url is [0])
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

-- cover_image_url for packages (may already exist — safe to run)
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Availability status (available | maintenance | private_use)
-- Setting maintenance or private_use auto-unpublishes the item via app logic.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'available'
  CHECK (availability_status IN ('available', 'maintenance', 'private_use'));

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'available'
  CHECK (availability_status IN ('available', 'maintenance', 'private_use'));
