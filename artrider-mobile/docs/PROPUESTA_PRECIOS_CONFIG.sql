-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
--
-- Nuevo modelo de precios (ver docs/PROPUESTA_PRECIOS_SERVIDOR.md):
--   * El Partner fija su precio (lo que gana); solo ese valor vive en listings.daily_price / packages.daily_price.
--   * Precio por día del Rider = ceil(precio_partner × (1 + partner_commission_rate)).
--   * Total del carrito = redondeo .99 de ceil(subtotal × (1 + service_fee_rate)), una sola vez.
--   * Las tasas son configurables (esta tabla) y cada reserva GUARDA las tasas y montos del momento de la compra.
-- Importes en centavos. Esta propuesta no modifica filas existentes (las columnas nuevas son NULL en reservas anteriores).

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Tabla de configuración: UNA sola fila, lectura pública, escritura solo service_role/admin
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_settings (
  -- Truco de fila única: la PK es un booleano que solo puede ser TRUE.
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  partner_commission_rate NUMERIC(6, 5) NOT NULL DEFAULT 0.15 CHECK (partner_commission_rate >= 0 AND partner_commission_rate <= 1),
  service_fee_rate        NUMERIC(6, 5) NOT NULL DEFAULT 0.05 CHECK (service_fee_rate >= 0 AND service_fee_rate <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users (id)
);

INSERT INTO public.pricing_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Cualquiera (incluso sin sesión) puede LEER las tasas: la app las necesita para mostrar precios.
DROP POLICY IF EXISTS "pricing_settings_read" ON public.pricing_settings;
CREATE POLICY "pricing_settings_read"
  ON public.pricing_settings FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- NO hay políticas de INSERT/UPDATE/DELETE: los usuarios no pueden escribir. Solo service_role (que se salta la RLS)
-- o un administrador mediante una función/panel propio. Refuerzo a nivel de privilegios:
REVOKE INSERT, UPDATE, DELETE ON public.pricing_settings FROM anon, authenticated;
GRANT SELECT ON public.pricing_settings TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_pricing_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_pricing_settings ON public.pricing_settings;
CREATE TRIGGER trg_touch_pricing_settings
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_pricing_settings();

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Funciones de cálculo (la MISMA fórmula que src/utils/pricing.ts) para que RPCs y Edge Functions no la reimplementen
-- ─────────────────────────────────────────────────────────────────────────

-- ceil(cents × (1 + rate)) con aritmética decimal exacta (NUMERIC), sin coma flotante.
CREATE OR REPLACE FUNCTION public.ceil_with_rate(p_cents INTEGER, p_rate NUMERIC)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CEIL(p_cents::NUMERIC * (1 + p_rate))::INTEGER;
$$;

-- Precio por día que ve el Rider.
CREATE OR REPLACE FUNCTION public.rider_daily_price(p_partner_cents INTEGER, p_commission_rate NUMERIC)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_partner_cents <= 0 THEN 0 ELSE public.ceil_with_rate(p_partner_cents, p_commission_rate) END;
$$;

-- Redondeo al .99 más cercano (empates hacia arriba); si queda < $1 se usa el valor exacto.
CREATE OR REPLACE FUNCTION public.round_to_99(p_cents INTEGER)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN (((p_cents + 1 + 50) / 100) * 100 - 1) < 100 THEN p_cents   -- división entera: floor((c + 51) / 100)
    ELSE ((p_cents + 1 + 50) / 100) * 100 - 1
  END;
$$;

-- Total del carrito completo (una sola vez; nunca por línea). Nunca por debajo del subtotal.
CREATE OR REPLACE FUNCTION public.cart_total(p_subtotal INTEGER, p_service_fee_rate NUMERIC)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(p_subtotal, public.round_to_99(public.ceil_with_rate(p_subtotal, p_service_fee_rate)));
$$;

-- Tasas vigentes (para usar dentro de RPCs SECURITY DEFINER y Edge Functions).
CREATE OR REPLACE FUNCTION public.get_pricing_settings()
RETURNS TABLE (partner_commission_rate NUMERIC, service_fee_rate NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT partner_commission_rate, service_fee_rate FROM pricing_settings LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_pricing_settings() TO anon, authenticated;

-- Vectores de prueba (deben dar lo mismo que `pnpm test:pricing`):
--   SELECT rider_daily_price(8000, 0.15);   -- 9200
--   SELECT cart_total(9200, 0.05);          -- 9699  (9660 → .99)
--   SELECT round_to_99(9240), round_to_99(9251), round_to_99(9250), round_to_99(9660);  -- 9199, 9299, 9299, 9699

-- ─────────────────────────────────────────────────────────────────────────
-- 3) Columnas para GUARDAR lo que se cobró (nullables: las reservas anteriores quedan en NULL)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS partner_amount INTEGER CHECK (partner_amount >= 0),             -- lo que gana el Partner: su precio × días × cantidad
  ADD COLUMN IF NOT EXISTS rider_subtotal INTEGER CHECK (rider_subtotal >= 0),             -- Σ precio del Rider × días × cantidad (antes de la tarifa)
  ADD COLUMN IF NOT EXISTS service_fee INTEGER CHECK (service_fee >= 0),                   -- tarifa de servicio asignada a esta reserva (= total_price − rider_subtotal)
  ADD COLUMN IF NOT EXISTS partner_commission_rate NUMERIC(6, 5),                          -- tasa usada en el momento de la compra
  ADD COLUMN IF NOT EXISTS service_fee_rate NUMERIC(6, 5);                                 -- tasa usada en el momento de la compra

-- Ingreso de ArtRider por reserva = total pagado − precio del Partner (absorbe el redondeo).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS platform_revenue INTEGER GENERATED ALWAYS AS (total_price - partner_amount) STORED;

ALTER TABLE public.checkout_orders
  ADD COLUMN IF NOT EXISTS partner_amount INTEGER CHECK (partner_amount >= 0),
  ADD COLUMN IF NOT EXISTS partner_commission_rate NUMERIC(6, 5),
  ADD COLUMN IF NOT EXISTS service_fee_rate NUMERIC(6, 5);
-- (checkout_orders.subtotal = subtotal con precios del Rider; service_fee = total − subtotal; total_price = total final.
--  La restricción existente subtotal + service_fee = total_price sigue cumpliéndose.)

-- Los montos guardados no se pueden cambiar después (ni siquiera por el propio Partner/Rider):
-- cambiar los porcentajes no debe alterar reservas ni ganancias pasadas.
CREATE OR REPLACE FUNCTION public.prevent_booking_pricing_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.partner_amount IS NOT NULL AND NEW.partner_amount IS DISTINCT FROM OLD.partner_amount)
     OR (OLD.rider_subtotal IS NOT NULL AND NEW.rider_subtotal IS DISTINCT FROM OLD.rider_subtotal)
     OR (OLD.service_fee IS NOT NULL AND NEW.service_fee IS DISTINCT FROM OLD.service_fee)
     OR (OLD.partner_commission_rate IS NOT NULL AND NEW.partner_commission_rate IS DISTINCT FROM OLD.partner_commission_rate)
     OR (OLD.service_fee_rate IS NOT NULL AND NEW.service_fee_rate IS DISTINCT FROM OLD.service_fee_rate)
     OR NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    RAISE EXCEPTION 'Los montos de una reserva no se pueden modificar.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_booking_pricing_mutation ON public.bookings;
CREATE TRIGGER trg_prevent_booking_pricing_mutation
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_pricing_mutation();

-- ─────────────────────────────────────────────────────────────────────────
-- 4) Lo que la app móvil espera leer del Partner
--    get_provider_bookings (no está en el repo) debe devolver además: partner_amount y rider_subtotal.
--    Mientras no lo haga, Ganancias estima el neto con las tasas actuales y lo marca como «aprox.».
-- ─────────────────────────────────────────────────────────────────────────
-- Reservas anteriores al nuevo modelo: se pueden dejar en NULL (estimadas) o rellenar con una migración de datos aparte
-- si se acuerda cómo valorarlas (no se hace aquí para no reescribir historial).
