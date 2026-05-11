-- =========================================================
-- MIGRATION: Decouple Messaging System
-- Goal: Make booking_id optional and add direct participant refs
-- Updated: 2026-05-11
-- =========================================================

BEGIN;

-- ── 1. Modify Conversations Table ──

-- Make booking_id nullable
ALTER TABLE conversations ALTER COLUMN booking_id DROP NOT NULL;

-- Add client_id (references profiles)
ALTER TABLE conversations ADD COLUMN client_id UUID REFERENCES profiles(id);

-- Add provider_id (references providers)
ALTER TABLE conversations ADD COLUMN provider_id UUID REFERENCES providers(id);

-- Add listing_id (references listings)
ALTER TABLE conversations ADD COLUMN listing_id UUID REFERENCES listings(id);

-- ── 2. Backfill Existing Data (Safety) ──
-- If there are conversations with booking_id, link them to the correct participants
UPDATE conversations
SET 
    client_id = bookings.client_id,
    provider_id = bookings.provider_id
FROM bookings
WHERE conversations.booking_id = bookings.id;

-- ── 3. Drop Old RLS Policies ──
DROP POLICY IF EXISTS "conversations_read" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;
DROP POLICY IF EXISTS "messages_read" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;

-- ── 4. Create New Participant-Based RLS Policies ──

-- Conversations
CREATE POLICY "conversations_read" ON conversations FOR SELECT
  USING (auth.uid() = client_id OR is_my_provider(provider_id));

CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (auth.uid() = client_id OR is_my_provider(provider_id));

-- Messages
CREATE POLICY "messages_read" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id 
        AND (auth.uid() = conversations.client_id OR is_my_provider(conversations.provider_id))
    )
  );

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id 
        AND (auth.uid() = conversations.client_id OR is_my_provider(conversations.provider_id))
    )
  );

-- ── 5. Add Indexes for Performance ──
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);

COMMIT;
