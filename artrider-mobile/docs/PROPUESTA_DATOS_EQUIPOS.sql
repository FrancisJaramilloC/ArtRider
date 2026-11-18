-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
--
-- Calidad de datos de los equipos (marca, modelo, especificaciones) para asesor de precios, matching e IA.
--
-- HALLAZGO: la columna listings.specs (jsonb) YA SE USA en la web (art-rider/services/adminService.ts y app/admin/equipos:
--   select specs / update specs, claves en español: environment, consumo_watts, potencia_watts_rms, max_spl, tipo_sistema (array),
--   cobertura_personas, incluye_subwoofer, tipo_iluminacion, incluye_dmx, tipo_video, tamano), pero NO está en las migraciones del repo.
--   Por eso se usa ADD COLUMN IF NOT EXISTS (no-op si ya existe). El esquema nuevo de la app móvil (src/constants/listingSpecs.ts,
--   con schema_version = 1) REUTILIZA esas claves cuando el dato es el mismo y CONSERVA las que no conoce al editar.
--
-- QUÉ HACE ESTE ARCHIVO
--   1) specs jsonb (si falta) + dos CHECK: tiene que ser un objeto y no pasar de 8 KB. Se crean NOT VALID: solo vigilan lo NUEVO,
--      así no fallan por datos antiguos; se pueden validar después (paso 4).
--   2) brand_normalized: columna GENERADA (minúsculas, sin espacios de más) + índice. Nadie la escribe: se calcula sola.
--      Sirve para agrupar «Sonic», «SONIC» y «sonic » como una sola marca en reportes, matching y sugerencias.
--   3) NO cambia ningún RPC ni la inserción: la app móvil inserta/actualiza listings directamente (providerCatalogService).
--      El único RPC que debe devolver specs es get_client_booking_detail: ya quedó actualizado en PROPUESTA_DETALLE_RESERVA_RIDER.sql.
--
-- ORDEN: aplicar este archivo ANTES de publicar la versión de la app que guarda specs (si la columna no existiera, guardar fallaría).

BEGIN;

-- 1) specs ─────────────────────────────────────────────────────────────
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS specs jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_specs_is_object') THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_specs_is_object CHECK (specs IS NULL OR jsonb_typeof(specs) = 'object') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_specs_max_size') THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_specs_max_size CHECK (specs IS NULL OR octet_length(specs::text) <= 8000) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.listings.specs IS
  'Especificaciones del equipo. Esquema en la app: src/constants/listingSpecs.ts (campo schema_version). Claves de la web se conservan.';

-- 2) brand_normalized ──────────────────────────────────────────────────
-- Generada y almacenada: no hay que tocar ningún INSERT/UPDATE. (Reescribe la tabla una vez; listings es pequeña.)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS brand_normalized text
  GENERATED ALWAYS AS (NULLIF(lower(regexp_replace(btrim(brand), '\s+', ' ', 'g')), '')) STORED;

CREATE INDEX IF NOT EXISTS listings_brand_normalized_idx ON public.listings (brand_normalized) WHERE deleted_at IS NULL;

COMMIT;

-- 4) (Opcional, después) Validar los CHECK contra los datos que ya había. Si falla, la consulta del paso 5C muestra cuáles:
--    ALTER TABLE public.listings VALIDATE CONSTRAINT listings_specs_is_object;
--    ALTER TABLE public.listings VALIDATE CONSTRAINT listings_specs_max_size;

-- ─────────────────────────────────────────────────────────────────────────
-- 5) EQUIPOS EXISTENTES QUE NO CUMPLIRÍAN (solo lectura; los corriges a mano). Ejecutar cada consulta por separado.
--
-- 5A) Lista de listings a corregir, con el motivo. Reglas nuevas: marca obligatoria, marca ≠ título, marca ≤ 30, modelo obligatorio ≤ 40,
--     título de 12 a 60 caracteres que contenga el modelo.
--    SELECT l.id, l.title, l.brand, l.model, l.category, pr.brand_name AS partner,
--           concat_ws('; ',
--             CASE WHEN NULLIF(btrim(l.brand), '') IS NULL THEN 'marca vacía' END,
--             CASE WHEN lower(regexp_replace(btrim(l.brand), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(l.title), '\s+', ' ', 'g')) THEN 'marca igual al título' END,
--             CASE WHEN length(btrim(l.brand)) > 30 THEN 'marca de más de 30 caracteres' END,
--             CASE WHEN NULLIF(btrim(l.model), '') IS NULL THEN 'modelo vacío' END,
--             CASE WHEN length(btrim(l.model)) > 40 THEN 'modelo de más de 40 caracteres' END,
--             CASE WHEN length(btrim(l.title)) NOT BETWEEN 12 AND 60 THEN 'título fuera de 12–60 caracteres' END,
--             CASE WHEN NULLIF(btrim(l.model), '') IS NOT NULL
--                   AND replace(lower(l.title), ' ', '') NOT LIKE '%' || replace(lower(btrim(l.model)), ' ', '') || '%' THEN 'el título no contiene el modelo' END
--           ) AS problemas
--    FROM public.listings l
--    LEFT JOIN public.providers pr ON pr.id = l.provider_id
--    WHERE l.deleted_at IS NULL
--      AND (   NULLIF(btrim(l.brand), '') IS NULL
--           OR lower(regexp_replace(btrim(l.brand), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(l.title), '\s+', ' ', 'g'))
--           OR length(btrim(l.brand)) > 30
--           OR NULLIF(btrim(l.model), '') IS NULL
--           OR length(btrim(l.model)) > 40
--           OR length(btrim(l.title)) NOT BETWEEN 12 AND 60
--           OR (NULLIF(btrim(l.model), '') IS NOT NULL
--               AND replace(lower(l.title), ' ', '') NOT LIKE '%' || replace(lower(btrim(l.model)), ' ', '') || '%'))
--    ORDER BY pr.brand_name, l.title;
--
-- 5B) Solo lo más grave (marca vacía o marca = título), que es lo que bloquea el matching:
--    SELECT l.id, l.title, l.brand, l.model
--    FROM public.listings l
--    WHERE l.deleted_at IS NULL
--      AND (NULLIF(btrim(l.brand), '') IS NULL
--           OR lower(regexp_replace(btrim(l.brand), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(l.title), '\s+', ' ', 'g')));
--
-- 5C) Marcas escritas de varias formas (después de aplicar el paso 2): cada fila es una marca que conviene unificar.
--    SELECT brand_normalized, array_agg(DISTINCT brand ORDER BY brand) AS escrituras, count(*) AS equipos
--    FROM public.listings WHERE deleted_at IS NULL AND brand_normalized IS NOT NULL
--    GROUP BY brand_normalized HAVING count(DISTINCT brand) > 1 ORDER BY equipos DESC;
--
-- 5D) specs que no cumplirían los CHECK (para poder validarlos):
--    SELECT id, jsonb_typeof(specs) AS tipo, octet_length(specs::text) AS bytes
--    FROM public.listings WHERE specs IS NOT NULL AND (jsonb_typeof(specs) <> 'object' OR octet_length(specs::text) > 8000);
--
-- 5E) Cobertura de specs hoy (cuántos equipos ya traen datos):
--    SELECT category, count(*) AS equipos, count(*) FILTER (WHERE specs IS NOT NULL AND specs <> '{}'::jsonb) AS con_specs
--    FROM public.listings WHERE deleted_at IS NULL GROUP BY category ORDER BY category;

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN tras aplicar (cada bloque por separado; todo termina en ROLLBACK, no deja datos):
--
-- V1) brand_normalized se calcula sola y agrupa las variantes (debe devolver 'sonic audio'):
--    SELECT NULLIF(lower(regexp_replace(btrim('  SONIC   Audio '), '\s+', ' ', 'g')), '') AS esperado;
--    SELECT column_name, is_generated FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name IN ('specs', 'brand_normalized');
--
-- V2) Un specs que NO es objeto debe rechazarse (debe fallar con «listings_specs_is_object»):
--    BEGIN;
--      UPDATE public.listings SET specs = '"texto"'::jsonb WHERE id = (SELECT id FROM public.listings LIMIT 1);
--    ROLLBACK;
--
-- V3) Un objeto válido pasa y brand_normalized responde (debe devolver 1 fila):
--    BEGIN;
--      UPDATE public.listings SET specs = '{"schema_version":1,"estado":"bueno"}'::jsonb WHERE id = (SELECT id FROM public.listings LIMIT 1)
--      RETURNING id, specs, brand_normalized;
--    ROLLBACK;
-- ─────────────────────────────────────────────────────────────────────────
