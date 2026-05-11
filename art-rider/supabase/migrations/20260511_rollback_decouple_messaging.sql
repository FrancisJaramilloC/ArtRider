-- =========================================================
-- ROLLBACK: Decouple Messaging System
-- USE ONLY IF the forward migration fails or needs reverting.
-- Execute in Supabase SQL Editor.
-- =========================================================

BEGIN;

-- ── 1. Drop new indexes ──
DROP INDEX IF EXISTS idx_conversations_client_id;
DROP INDEX IF EXISTS idx_conversations_provider_id;
DROP INDEX IF EXISTS idx_conversations_listing_id;

-- ── 2. Drop new RLS policies ──
DROP POLICY IF EXISTS "conversations_read" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;
DROP POLICY IF EXISTS "messages_read" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;

-- ── 3. Remove new columns ──
ALTER TABLE conversations DROP COLUMN IF EXISTS listing_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS provider_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS client_id;

-- ── 4. Restore booking_id as NOT NULL ──
ALTER TABLE conversations ALTER COLUMN booking_id SET NOT NULL;

-- ── 5. Restore original booking-based RLS policies ──
CREATE POLICY "conversations_read" ON conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = conversations.booking_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id)))
  );

CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id)))
  );

CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = conversations.booking_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id)))
  );

CREATE POLICY "messages_read" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN bookings ON conversations.booking_id = bookings.id
      WHERE conversations.id = messages.conversation_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      JOIN bookings ON conversations.booking_id = bookings.id
      WHERE conversations.id = conversation_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id))
    )
  );

COMMIT;
