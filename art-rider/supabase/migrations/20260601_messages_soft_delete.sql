BEGIN;

-- ─────────────────────────────────────────────
-- 1. conversation_deleted  (soft-delete per user)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_deleted (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id)           ON DELETE CASCADE,
  deleted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_deleted ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_deleted_select" ON public.conversation_deleted
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "conv_deleted_insert" ON public.conversation_deleted
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conv_deleted_delete" ON public.conversation_deleted
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 2. conversation_archived  (archive per user)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_archived (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id)           ON DELETE CASCADE,
  archived_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_archived ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_archived_select" ON public.conversation_archived
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "conv_archived_insert" ON public.conversation_archived
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conv_archived_delete" ON public.conversation_archived
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 3. Enable realtime on messages
--    (wrapped so it's idempotent)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMIT;
