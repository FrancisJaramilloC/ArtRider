-- =========================================================
-- ROLLBACK: Snapshot Histórico para Inmutabilidad de Contratos
-- =========================================================

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_prevent_snapshot_mutation ON bookings;
DROP TRIGGER IF EXISTS trg_booking_unit_snapshot ON booking_units;
DROP TRIGGER IF EXISTS trg_booking_snapshot ON bookings;

-- Drop functions
DROP FUNCTION IF EXISTS prevent_snapshot_mutation();
DROP FUNCTION IF EXISTS populate_booking_listing_snapshot();
DROP FUNCTION IF EXISTS populate_booking_snapshots();

-- Remove snapshot columns
ALTER TABLE digital_contracts DROP COLUMN IF EXISTS snapshot_booking;
ALTER TABLE bookings DROP COLUMN IF EXISTS snapshot_provider;
ALTER TABLE bookings DROP COLUMN IF EXISTS snapshot_address;
ALTER TABLE bookings DROP COLUMN IF EXISTS snapshot_listing;

COMMIT;
