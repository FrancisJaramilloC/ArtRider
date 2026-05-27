-- ─── Migration 002: Gallery images ─────────────────────────────────────────
-- Run in Supabase Dashboard → SQL Editor
--
-- NOTA: availability_status NO se agrega a listings/packages.
-- La disponibilidad operativa (MAINTENANCE, BLOCKED) se gestiona
-- a través de availability_calendar.status (ENUM ya existente).

-- Gallery images (hasta 6 por listing/package; cover_image_url es [0])
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

-- cover_image_url para packages (puede ya existir vía 20260526 — seguro ejecutar)
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
