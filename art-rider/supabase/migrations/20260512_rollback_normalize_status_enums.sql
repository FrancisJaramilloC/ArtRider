-- =========================================================
-- ROLLBACK: Normalización de Estados (PostgreSQL ENUMs)
-- Revierte las columnas de estado a tipo TEXT plano y elimina los ENUMs.
-- =========================================================

BEGIN;

-- ── 1. Tabla: equipment_units ──

ALTER TABLE equipment_units ALTER COLUMN internal_status DROP DEFAULT;
ALTER TABLE equipment_units ALTER COLUMN internal_status TYPE TEXT USING internal_status::TEXT;
ALTER TABLE equipment_units ALTER COLUMN internal_status SET DEFAULT 'AVAILABLE';

DROP TYPE IF EXISTS equipment_status;

-- ── 2. Tabla: providers ──

ALTER TABLE providers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE providers ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE providers ALTER COLUMN status SET DEFAULT 'pending';

DROP TYPE IF EXISTS provider_status;

-- ── 3. Tabla: identity_verifications ──

ALTER TABLE identity_verifications ALTER COLUMN status DROP DEFAULT;
ALTER TABLE identity_verifications ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE identity_verifications ALTER COLUMN status SET DEFAULT 'pending';

DROP TYPE IF EXISTS verification_status;

COMMIT;
