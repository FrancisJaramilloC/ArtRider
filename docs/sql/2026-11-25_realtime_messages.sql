-- Activa Realtime para public.messages (ya ejecutado en producción el 2026-11-25).
-- Motivo: la pestaña Mensajes se actualiza escuchando INSERT/UPDATE de messages por Realtime, pero en
-- producción solo estaba publicada notifications; la migración de la web que añade messages no se aplicó.
-- Realtime respeta las policies RLS de messages (messages_read).
BEGIN;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
COMMIT;
-- Verificación: SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;  -- messages, notifications
-- Reversa: ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
