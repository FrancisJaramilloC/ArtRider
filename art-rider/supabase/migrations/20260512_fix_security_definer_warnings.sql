-- =========================================================
-- MIGRATION: Fix Security Advisor Warnings (SECURITY DEFINER)
-- Añade search_path = '' a funciones SECURITY DEFINER y
-- revoca privilegios EXECUTE del rol PUBLIC.
-- Updated: 2026-05-12
-- =========================================================

BEGIN;

-- 1. Fijar search_path para evitar mutación de rutas
ALTER FUNCTION public.populate_booking_listing_snapshot() SET search_path = '';
ALTER FUNCTION public.populate_booking_snapshots() SET search_path = '';
ALTER FUNCTION public.prevent_contract_cross_signature() SET search_path = '';
ALTER FUNCTION public.is_my_provider(uuid) SET search_path = '';
ALTER FUNCTION public.prevent_snapshot_mutation() SET search_path = '';
ALTER FUNCTION public.prevent_booking_identity_mutation() SET search_path = '';

-- 2. Revocar acceso público (anon/unauthenticated/otros) por defecto
REVOKE EXECUTE ON FUNCTION public.populate_booking_listing_snapshot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.populate_booking_snapshots() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_contract_cross_signature() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_my_provider(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_snapshot_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_booking_identity_mutation() FROM PUBLIC;

-- 3. Conceder explícitamente a los roles necesarios para funciones usadas en RLS
GRANT EXECUTE ON FUNCTION public.is_my_provider(uuid) TO anon, authenticated, service_role;

COMMIT;
