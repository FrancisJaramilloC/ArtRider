-- =========================================================
-- MIGRATION: Normalización de Estados (PostgreSQL ENUMs)
-- Convierte las columnas de estado de texto plano a ENUMs.
-- Updated: 2026-05-12
-- =========================================================

BEGIN;

-- ── 1. Tabla: identity_verifications ──

-- Crear ENUM
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Alterar columna
ALTER TABLE identity_verifications ALTER COLUMN status DROP DEFAULT;
ALTER TABLE identity_verifications ALTER COLUMN status TYPE verification_status USING status::verification_status;
ALTER TABLE identity_verifications ALTER COLUMN status SET DEFAULT 'pending'::verification_status;

-- ── 2. Tabla: providers ──

-- Crear ENUM
CREATE TYPE provider_status AS ENUM ('pending', 'active', 'suspended');

-- Alterar columna
ALTER TABLE providers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE providers ALTER COLUMN status TYPE provider_status USING status::provider_status;
ALTER TABLE providers ALTER COLUMN status SET DEFAULT 'pending'::provider_status;

-- ── 3. Tabla: equipment_units ──

-- Crear ENUM
CREATE TYPE equipment_status AS ENUM ('AVAILABLE', 'MAINTENANCE', 'RETIRED', 'LOST');

-- Alterar columna
ALTER TABLE equipment_units ALTER COLUMN internal_status DROP DEFAULT;
ALTER TABLE equipment_units ALTER COLUMN internal_status TYPE equipment_status USING internal_status::equipment_status;
ALTER TABLE equipment_units ALTER COLUMN internal_status SET DEFAULT 'AVAILABLE'::equipment_status;

COMMIT;
