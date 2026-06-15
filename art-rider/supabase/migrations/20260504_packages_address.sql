-- =========================================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =========================================================

-- Añadir address_id a packages para permitir ubicar el paquete en el mapa
ALTER TABLE packages ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES addresses(id);

-- Opcional: Para paquetes existentes, intentar heredar la dirección del dueño si la tiene
-- UPDATE packages p
-- SET address_id = (SELECT id FROM addresses WHERE user_id = p.owner_id LIMIT 1)
-- WHERE address_id IS NULL;
