-- =========================================================
-- ArtRider Migration: Align schema with Class Diagram v4.0
-- =========================================================
-- Run this migration MANUALLY in Supabase SQL Editor
-- after reviewing the changes below.
-- =========================================================

-- ─────────────────────────────────────────────────────────
-- 1. REVIEWS TABLE (Missing from original schema)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS: Only booking participants can see/write reviews
CREATE POLICY "Reviews visible to booking participants" ON reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
      AND auth.uid() IN (bookings.client_id, bookings.owner_id)
    )
    OR auth.uid() = target_id  -- Target user can always see reviews about them
  );

CREATE POLICY "Only booking participants can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND auth.uid() IN (bookings.client_id, bookings.owner_id)
      AND bookings.status = 'COMPLETED'
    )
  );

CREATE POLICY "Prevent update reviews" ON reviews
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Prevent delete reviews" ON reviews
  FOR DELETE USING (false);


-- ─────────────────────────────────────────────────────────
-- 2. DIGITAL CONTRACTS — Add bilateral signature fields
--    (Aligning with Class Diagram v4.0)
-- ─────────────────────────────────────────────────────────

-- Add version tracking
ALTER TABLE digital_contracts ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'v1.0-2025';

-- Owner signature fields
ALTER TABLE digital_contracts ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMPTZ;
ALTER TABLE digital_contracts ADD COLUMN IF NOT EXISTS owner_signature_hash TEXT;
ALTER TABLE digital_contracts ADD COLUMN IF NOT EXISTS owner_pdf_url TEXT;

-- Client signature fields
ALTER TABLE digital_contracts ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMPTZ;
ALTER TABLE digital_contracts ADD COLUMN IF NOT EXISTS client_signature_hash TEXT;
ALTER TABLE digital_contracts ADD COLUMN IF NOT EXISTS client_pdf_url TEXT;


-- ─────────────────────────────────────────────────────────
-- 3. MESSAGES — Add sent_at timestamp
-- ─────────────────────────────────────────────────────────

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();


-- ─────────────────────────────────────────────────────────
-- 4. PAYMENTS — Add security_deposit_amount and created_at
-- ─────────────────────────────────────────────────────────

ALTER TABLE payments ADD COLUMN IF NOT EXISTS security_deposit_amount INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
