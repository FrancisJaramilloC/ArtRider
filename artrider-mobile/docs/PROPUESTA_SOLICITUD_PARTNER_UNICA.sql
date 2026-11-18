-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
--
-- Contexto: «Convertirse en Partner» inserta una fila en `providers` con status = 'pending' desde la app.
-- Hallazgos en el repo (no pude ver la base real):
--   * schema.sql declara `user_id UUID UNIQUE`: ya impide dos solicitudes por usuario (la app trata 23505 como «ya existe»).
--   * La política de INSERT es solo `WITH CHECK (auth.uid() = user_id)` y el trigger `prevent_provider_status_self_change`
--     es BEFORE UPDATE: nada impide que un cliente que llame a la API directamente inserte con status = 'active'
--     y se salte la revisión. Esta propuesta lo cierra.

-- 1) VERIFICAR (solo lectura)
-- ¿Existe la restricción única sobre user_id?
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.providers'::regclass AND contype = 'u';

-- Políticas actuales de INSERT sobre providers.
SELECT policyname, cmd, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'providers';

-- 2) Solo si el paso 1 no muestra una restricción única sobre (user_id):
-- ALTER TABLE public.providers ADD CONSTRAINT providers_user_id_key UNIQUE (user_id);

-- 3) Obligar a que una solicitud nueva nazca 'pending' (el cambio a 'active' lo hace un administrador con service_role).
DROP POLICY IF EXISTS "providers_owner_insert" ON public.providers;
CREATE POLICY "providers_owner_insert"
  ON public.providers FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
