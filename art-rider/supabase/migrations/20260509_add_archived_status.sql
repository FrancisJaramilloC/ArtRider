-- =========================================================
-- ArtRider Migration: Add ARCHIVED booking status
-- Date: 2026-05-09
-- Adds the ARCHIVED enum value, the archived_at timestamp
-- column, and RLS policies for both clients and providers.
-- Run in Supabase Dashboard > SQL Editor.
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- 1. Extend booking_status enum
-- ADD VALUE IF NOT EXISTS is idempotent; it is a DDL
-- statement that cannot run inside a transaction block in
-- older Postgres versions — run standalone if needed.
-- ─────────────────────────────────────────────────────────
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'ARCHIVED';


-- ─────────────────────────────────────────────────────────
-- 2. Add archived_at column to bookings
-- ─────────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────
-- 3. RLS: clients can read their own archived bookings
-- Mirrors the same auth.uid() = client_id pattern used for
-- active bookings across the rest of the bookings policies.
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bookings_client_read_archived" ON bookings;
CREATE POLICY "bookings_client_read_archived" ON bookings
  FOR SELECT
  USING (
    auth.uid() = client_id
    AND status = 'ARCHIVED'
  );


-- ─────────────────────────────────────────────────────────
-- 4. RLS: providers can read archived bookings they own
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bookings_owner_read_archived" ON bookings;
CREATE POLICY "bookings_owner_read_archived" ON bookings
  FOR SELECT
  USING (
    auth.uid() = owner_id
    AND status = 'ARCHIVED'
  );
