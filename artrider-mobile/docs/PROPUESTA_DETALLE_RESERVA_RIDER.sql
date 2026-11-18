-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
--
-- RPC get_client_booking_detail(p_booking_id uuid): todo lo que necesita la pantalla «Detalle de reserva» del Rider, en UNA llamada.
--   * SECURITY DEFINER, search_path = public. Verifica que la reserva sea del usuario que llama (client_id = auth.uid()).
--     Si no existe o es de otra persona responde lo mismo ('Reserva no encontrada'): no revela si el id existe.
--   * Solo lo que el Rider puede ver: desglose del RIDER (rider_subtotal, service_fee, total). NUNCA partner_amount, comisión,
--     tasas ni platform_revenue. Tampoco la dirección exacta (solo la ciudad) ni el user_id del Partner.
--   * El teléfono del Partner solo se devuelve con la reserva ACTIVE / PAID / COMPLETED.
--   * Permisos: solo `authenticated` (ni PUBLIC ni anon).
--
-- Dependencias y supuestos (la base real no está en el repo; revisar contra ella antes de aplicar):
--   * bookings: id, client_id, provider_id, status, start_date, end_date, created_at, total_price, snapshot_listing (jsonb),
--     kushki_ticket, order_id, booking_units(booking_id, equipment_unit_id), equipment_units(listing_id)  → confirmados por create_booking / get_provider_bookings.
--   * listings: title, description, cover_image_url, brand, model, category, address_id, is_published, deleted_at, provider_id.
--     packages: title, description, cover_image_url, address_id, is_published, deleted_at, provider_id.   addresses: id, city.
--   * providers: id, user_id, brand_name.   profiles: id, avatar_url, phone.   reviews: booking_id, author_id.
--   * rider_subtotal y service_fee de la reserva (CONFIG.sql del nuevo modelo de precios) se leen con to_jsonb(b)->>'columna':
--     si aún no existen o son NULL (reservas anteriores) devuelven NULL y la app calcula el desglose del modelo anterior. Así esta
--     función se puede aplicar ANTES o DESPUÉS de PROPUESTA_PRECIOS_CONFIG.sql.
--   * listings.specs existe en la base (la web lo usa) aunque no esté en las migraciones del repo; se lee con to_jsonb(...)->'specs' para no fallar si no
--     existiera. La app muestra marca, modelo, categoría y las especificaciones que tengan dato (ver PROPUESTA_DATOS_EQUIPOS.sql).

BEGIN;

DROP FUNCTION IF EXISTS public.get_client_booking_detail(uuid);

CREATE FUNCTION public.get_client_booking_detail(p_booking_id uuid)
RETURNS TABLE (
  booking_id uuid,
  status text,
  start_date date,
  end_date date,
  created_at timestamptz,
  order_id uuid,
  item_type text,                -- 'listing' | 'package'
  item_id uuid,                  -- para «Reservar de nuevo» (abre el equipo o paquete)
  item_available boolean,        -- publicado y no eliminado hoy
  title text,
  description text,
  cover_image_url text,
  brand text,
  model text,
  category text,
  specs jsonb,                   -- especificaciones (esquema en src/constants/listingSpecs.ts); NULL si no hay
  city text,                     -- solo la ciudad; nunca la dirección exacta
  quantity integer,
  provider_id uuid,              -- providers.id, para abrir/crear el chat
  provider_name text,
  provider_avatar_url text,
  provider_phone text,           -- NULL salvo ACTIVE / PAID / COMPLETED
  rider_subtotal integer,        -- NULL en reservas anteriores al nuevo modelo
  service_fee integer,           -- NULL en reservas anteriores al nuevo modelo
  total_price integer,
  kushki_ticket text,
  already_reviewed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user uuid := auth.uid();
  v_b bookings%ROWTYPE;
  v_snap jsonb;
  v_type text;
  v_item uuid;
  v_available boolean := false;
  v_title text;
  v_description text;
  v_cover text;
  v_brand text;
  v_model text;
  v_category text;
  v_specs jsonb;
  v_address uuid;
  v_city text;
  v_quantity integer;
  v_provider_name text;
  v_provider_user uuid;
  v_avatar text;
  v_phone text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id AND client_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;

  v_snap := v_b.snapshot_listing;

  IF v_snap ->> 'type' = 'package' THEN
    v_type := 'package';
    v_item := NULLIF(v_snap ->> 'id', '')::uuid;
    SELECT pkg.title, pkg.description, pkg.cover_image_url, pkg.address_id, (pkg.is_published AND pkg.deleted_at IS NULL), to_jsonb(pkg) -> 'specs'
      INTO v_title, v_description, v_cover, v_address, v_available, v_specs
    FROM packages pkg WHERE pkg.id = v_item;
  ELSE
    v_type := 'listing';
    -- El snapshot trae el id del equipo en las reservas de la app; si falta, se deduce de la unidad reservada.
    v_item := COALESCE(
      NULLIF(v_snap ->> 'id', '')::uuid,
      (SELECT eu.listing_id FROM booking_units bu JOIN equipment_units eu ON eu.id = bu.equipment_unit_id
        WHERE bu.booking_id = v_b.id ORDER BY bu.id LIMIT 1)
    );
    -- to_jsonb(l) -> 'specs': si la columna no existiera devolvería NULL en vez de fallar.
    SELECT l.title, l.description, l.cover_image_url, l.brand, l.model, l.category, l.address_id, (l.is_published AND l.deleted_at IS NULL), to_jsonb(l) -> 'specs'
      INTO v_title, v_description, v_cover, v_brand, v_model, v_category, v_address, v_available, v_specs
    FROM listings l WHERE l.id = v_item;
  END IF;

  IF v_address IS NOT NULL THEN
    SELECT a.city INTO v_city FROM addresses a WHERE a.id = v_address;
  END IF;

  -- Cantidad: la guarda el snapshot (create_booking); si no, 1.
  v_quantity := COALESCE(NULLIF(v_snap ->> 'quantity', '')::integer, 1);

  SELECT p.brand_name, p.user_id INTO v_provider_name, v_provider_user FROM providers p WHERE p.id = v_b.provider_id;
  IF v_provider_user IS NOT NULL THEN
    SELECT pr.avatar_url, pr.phone INTO v_avatar, v_phone FROM profiles pr WHERE pr.id = v_provider_user;
  END IF;
  IF v_b.status::text NOT IN ('ACTIVE', 'PAID', 'COMPLETED') THEN
    v_phone := NULL;
  END IF;

  RETURN QUERY SELECT
    v_b.id,
    v_b.status::text,
    v_b.start_date,
    v_b.end_date,
    v_b.created_at,
    v_b.order_id,
    v_type,
    v_item,
    COALESCE(v_available, false),
    COALESCE(v_snap ->> 'title', v_title),
    v_description,
    v_cover,
    v_brand,
    v_model,
    v_category,
    NULLIF(v_specs, 'null'::jsonb),
    v_city,
    v_quantity,
    v_b.provider_id,
    v_provider_name,
    v_avatar,
    v_phone,
    (to_jsonb(v_b) ->> 'rider_subtotal')::integer,
    (to_jsonb(v_b) ->> 'service_fee')::integer,
    v_b.total_price,
    v_b.kushki_ticket,
    EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = v_b.id AND r.author_id = v_user);
END;
$$;

-- DROP + CREATE reinicia los permisos: se dejan explícitos. Solo usuarios con sesión.
REVOKE ALL ON FUNCTION public.get_client_booking_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_booking_detail(uuid) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (después de aplicar). Se simula a un usuario real SIN tocar datos: todo dentro de una transacción que termina en ROLLBACK.
-- Sustituir <rider_uuid> (el client_id de la reserva), <otro_uuid> (cualquier otro usuario) y <booking_uuid>.
-- Ejecutar CADA bloque por separado en el SQL editor.
--
-- 1) El dueño ve su reserva (debe devolver 1 fila; comprobar que NO hay columnas partner_amount / comisión):
--    BEGIN;
--      SELECT set_config('request.jwt.claims', json_build_object('sub', '<rider_uuid>', 'role', 'authenticated')::text, true);
--      SET LOCAL ROLE authenticated;
--      SELECT * FROM public.get_client_booking_detail('<booking_uuid>');
--    ROLLBACK;
--
-- 2) Otro usuario NO la ve (debe fallar con «Reserva no encontrada»):
--    BEGIN;
--      SELECT set_config('request.jwt.claims', json_build_object('sub', '<otro_uuid>', 'role', 'authenticated')::text, true);
--      SET LOCAL ROLE authenticated;
--      SELECT * FROM public.get_client_booking_detail('<booking_uuid>');
--    ROLLBACK;
--
-- 3) Sin sesión (anon) no puede ni llamarla (debe fallar con «permission denied for function»):
--    BEGIN;
--      SET LOCAL ROLE anon;
--      SELECT * FROM public.get_client_booking_detail('<booking_uuid>');
--    ROLLBACK;
--
-- 4) El teléfono del Partner solo aparece con ACTIVE / PAID / COMPLETED: repetir el bloque 1 con una reserva AWAITING_SIGNATURES
--    y comprobar que provider_phone sale NULL.
--
-- 5) Permisos (solo debe listar `authenticated`, además del dueño de la función):
--    SELECT grantee, privilege_type FROM information_schema.routine_privileges
--    WHERE routine_schema = 'public' AND routine_name = 'get_client_booking_detail';
-- ─────────────────────────────────────────────────────────────────────────
