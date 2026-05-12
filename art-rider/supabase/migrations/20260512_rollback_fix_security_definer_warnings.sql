-- =========================================================
-- ROLLBACK: Fix Security Advisor Warnings
-- =========================================================

BEGIN;

-- 1. Restaurar permisos EXECUTE a PUBLIC
GRANT EXECUTE ON FUNCTION public.populate_booking_listing_snapshot() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.populate_booking_snapshots() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_contract_cross_signature() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_my_provider(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_snapshot_mutation() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_booking_identity_mutation() TO PUBLIC;

-- 2. Quitar search_path = '' (volver al default dinámico)
ALTER FUNCTION public.populate_booking_listing_snapshot() RESET search_path;
ALTER FUNCTION public.populate_booking_snapshots() RESET search_path;
ALTER FUNCTION public.prevent_contract_cross_signature() RESET search_path;
ALTER FUNCTION public.is_my_provider(uuid) RESET search_path;
ALTER FUNCTION public.prevent_snapshot_mutation() RESET search_path;
ALTER FUNCTION public.prevent_booking_identity_mutation() RESET search_path;

COMMIT;
