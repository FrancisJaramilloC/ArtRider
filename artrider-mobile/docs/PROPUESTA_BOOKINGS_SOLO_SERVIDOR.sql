-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
--
-- HALLAZGO (según el repo; confirmar contra la base real con la consulta A):
--   La política RLS `bookings_update` (art-rider/supabase/rls.sql y migrations/20260511_provider_identity_consolidation.sql) es
--       FOR UPDATE USING (auth.uid() = client_id OR is_my_provider(provider_id))
--                 WITH CHECK (auth.uid() = client_id OR is_my_provider(provider_id))
--   y los únicos triggers (prevent_booking_identity_mutation) solo protegen client_id, provider_id y total_price. Es decir: CUALQUIER
--   cliente autenticado puede hacer UPDATE directo sobre sus reservas y cambiar `status` a lo que quiera (ACTIVE, PAID, COMPLETED,
--   CANCELLED sin reembolso…) y el Partner puede cambiar cualquier columna de las suyas. La app móvil ya NO lo necesita:
--     - el Rider cancela con la Edge Function client-cancel-booking (reembolsa y luego marca CANCELLED con service_role);
--     - el Partner acepta/rechaza con provider-respond-booking → RPC provider_set_booking_status (SECURITY DEFINER) y finaliza con
--       provider_finalize_booking (RPC).
--
-- ⚠ ANTES DE APLICAR (la WEB sí hace UPDATE directo y se rompería): art-rider/services/bookingsService.ts
--     ~l.317  .update({ status: 'ARCHIVED', archived_at })      ~l.547  .update({ status })      ~l.630  .update({ status: 'CANCELLED' })
--   Hay que migrar esas tres rutas de la web a funciones del servidor (o aplicar solo la OPCIÓN B mientras tanto).
--   Las funciones SECURITY DEFINER y service_role no dependen de esta política: siguen funcionando.
--
-- A) Comprobar el estado real (solo lectura, ejecutar antes):
--    SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings';
--    SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND table_name = 'bookings' AND grantee IN ('anon', 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────
-- OPCIÓN A (recomendada, definitiva): ningún usuario puede actualizar bookings directamente.
-- ─────────────────────────────────────────────────────────────────────────
BEGIN;

DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "Client and owner can update bookings safely" ON public.bookings;   -- nombre antiguo, por si quedó

-- Refuerzo a nivel de privilegios: aunque alguien recreara una política, sin privilegio UPDATE no hay escritura.
REVOKE UPDATE ON public.bookings FROM anon, authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- OPCIÓN B (transitoria, si la web aún no migró): el CLIENTE no puede cambiar `status` ni pasar a CANCELLED por su cuenta;
-- el resto (p. ej. archivar su propia reserva desde la web) sigue igual. service_role y funciones SECURITY DEFINER pasan.
-- NO usar junto con la opción A. La cancelación de la web (l.630) dejaría de funcionar: debe usar una función del servidor.
-- ─────────────────────────────────────────────────────────────────────────
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.prevent_client_status_change()
-- RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- BEGIN
--   IF auth.role() = 'service_role' OR current_user NOT IN ('authenticated', 'anon') THEN
--     RETURN NEW;   -- servidor (Edge Functions con service_role, RPC SECURITY DEFINER): sin restricción
--   END IF;
--   IF NEW.status IS DISTINCT FROM OLD.status AND NOT (NEW.status::text = 'ARCHIVED' AND OLD.status::text IN ('COMPLETED', 'CANCELLED')) THEN
--     RAISE EXCEPTION 'El estado de una reserva solo se cambia desde el servidor.';
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
-- DROP TRIGGER IF EXISTS trg_prevent_client_status_change ON public.bookings;
-- CREATE TRIGGER trg_prevent_client_status_change BEFORE UPDATE ON public.bookings
--   FOR EACH ROW EXECUTE FUNCTION public.prevent_client_status_change();
-- COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (después de aplicar la opción A). Todo dentro de una transacción que termina en ROLLBACK.
-- Sustituir <rider_uuid> (client_id de una reserva) y <booking_uuid>.
--
-- 1) Un Rider ya NO puede cambiar el estado de su reserva (debe fallar con «permission denied for table bookings»):
--    BEGIN;
--      SELECT set_config('request.jwt.claims', json_build_object('sub', '<rider_uuid>', 'role', 'authenticated')::text, true);
--      SET LOCAL ROLE authenticated;
--      UPDATE public.bookings SET status = 'COMPLETED' WHERE id = '<booking_uuid>';
--    ROLLBACK;
--
-- 2) Sigue pudiendo LEER sus reservas (debe devolver 1 fila):
--    BEGIN;
--      SELECT set_config('request.jwt.claims', json_build_object('sub', '<rider_uuid>', 'role', 'authenticated')::text, true);
--      SET LOCAL ROLE authenticated;
--      SELECT id, status FROM public.bookings WHERE id = '<booking_uuid>';
--    ROLLBACK;
--
-- 3) Ya no queda política de UPDATE (no debe devolver filas):
--    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND cmd = 'UPDATE';
--
-- 4) Prueba funcional: cancelar una reserva de prueba desde la app (Edge Function) y aceptar/rechazar como Partner siguen funcionando.
-- ─────────────────────────────────────────────────────────────────────────
