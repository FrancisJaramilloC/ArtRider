-- =====================================================================
-- ArtRider · Bloque 1 · Pagos y reembolsos (plan: docs/PLAN_pagos-reembolsos.md)
-- Proyecto: rgjsjesjvxcybprtmhrc (PRODUCCIÓN, sin backups)
-- Dónde: Supabase → SQL Editor. Pegar TODO el archivo y ejecutar una sola vez.
-- Qué hace:
--   1) provider_finalize_booking: no deja finalizar antes del día de fin (hora de Ecuador)
--      ni si la reserva tiene un reembolso vivo en payment_refunds.
--   2) Crea public.payment_refunds (registro de reembolsos; solo servidor).
--   3) Registra el reembolso del incidente del 20-nov como SUCCEEDED (confirmado en Kushki).
-- No borra ni modifica datos existentes de reservas ni pedidos.
-- =====================================================================

BEGIN;

-- 0) Comprobaciones previas: si algo no cuadra, se aborta todo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'payment_refunds') THEN
    RAISE EXCEPTION 'public.payment_refunds ya existe: revisar antes de seguir';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings
                 WHERE id = '443bdfa3-451c-4f0b-a353-43c9e4080542'
                   AND status::text = 'CANCELLED'
                   AND kushki_ticket IS NOT NULL
                   AND total_price = 604) THEN
    RAISE EXCEPTION 'La reserva del incidente no está como se esperaba (CANCELLED con ticket y total_price = 604)';
  END IF;
END $$;

-- 1) provider_finalize_booking con validación de fecha -----------------
CREATE OR REPLACE FUNCTION public.provider_finalize_booking(
  p_booking_id uuid,
  p_rating integer DEFAULT NULL::integer,
  p_comment text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_provider_id uuid;
  v_client_id uuid;
  v_current_status text;
  v_end_date date;
  v_today date := (now() at time zone 'America/Guayaquil')::date;
  v_conversation_id uuid;
begin
  select pr.id into v_provider_id from public.providers pr where pr.user_id = auth.uid();
  if v_provider_id is null then
    raise exception 'No eres proveedor';
  end if;

  -- FOR UPDATE: evita que dos llamadas simultáneas finalicen/cancelen la misma reserva a la vez.
  select b.client_id, b.status::text, b.end_date
    into v_client_id, v_current_status, v_end_date
  from public.bookings b
  where b.id = p_booking_id and b.provider_id = v_provider_id
  for update;

  if v_client_id is null then
    raise exception 'Reserva no encontrada o no te pertenece';
  end if;

  if v_current_status not in ('ACTIVE', 'PAID') then
    raise exception 'Solo puedes finalizar reservas activas';
  end if;

  -- NUEVO (bug QA #36): no se puede finalizar antes del día de fin de la reserva.
  if v_end_date is null or v_end_date > v_today then
    raise exception 'Solo puedes finalizar esta reserva desde el %', coalesce(to_char(v_end_date, 'DD/MM/YYYY'), 'día de fin de la reserva');
  end if;

  -- NUEVO (re-review N1): no se finaliza (pasa a "Ganado") una reserva con un reembolso vivo.
  -- Mismos estados que el índice único payment_refunds_one_live_per_booking. El mensaje empieza con
  -- "Solo puedes finalizar" porque la app muestra tal cual los errores con ese prefijo.
  if exists (
    select 1 from public.payment_refunds r
    where r.booking_id = p_booking_id
      and r.status in ('PENDING', 'SUCCEEDED', 'UNKNOWN', 'MANUAL_REQUIRED')
  ) then
    raise exception 'Solo puedes finalizar esta reserva cuando no tenga un reembolso en curso';
  end if;

  update public.bookings set status = 'COMPLETED'::public.booking_status where id = p_booking_id;

  if p_rating is not null then
    insert into public.reviews (booking_id, author_id, target_id, rating, comment)
    values (p_booking_id, auth.uid(), v_client_id, p_rating, p_comment);
  end if;

  select c.id into v_conversation_id from public.conversations c where c.booking_id = p_booking_id limit 1;
  if v_conversation_id is not null then
    insert into public.conversation_deleted (user_id, conversation_id)
    values (auth.uid(), v_conversation_id)
    on conflict (user_id, conversation_id) do nothing;
    insert into public.conversation_deleted (user_id, conversation_id)
    values (v_client_id, v_conversation_id)
    on conflict (user_id, conversation_id) do nothing;
  end if;
end;
$function$;

REVOKE ALL ON FUNCTION public.provider_finalize_booking(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_finalize_booking(uuid, integer, text) TO authenticated;

-- 2) Registro de reembolsos (solo servidor) ----------------------------
CREATE TABLE public.payment_refunds (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     uuid REFERENCES public.bookings(id),
  order_id       uuid REFERENCES public.orders(id),
  kushki_ticket  text NOT NULL,
  amount_cents   integer NOT NULL CHECK (amount_cents > 0),
  reason         text NOT NULL CHECK (reason IN ('PROVIDER_REJECT', 'CLIENT_CANCEL', 'CHARGE_VOID', 'MANUAL')),
  status         text NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'MANUAL_REQUIRED')),
  kushki_code    text,
  kushki_message text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_refunds_booking_required CHECK (booking_id IS NOT NULL OR reason = 'CHARGE_VOID')
);

COMMENT ON TABLE public.payment_refunds IS
  'Intentos de reembolso/anulación en Kushki. Solo Edge Functions con service key. Un solo reembolso vivo por reserva.';

-- Un solo reembolso "vivo" por reserva: impide el doble reembolso (Partner y Rider a la vez, doble toque).
CREATE UNIQUE INDEX payment_refunds_one_live_per_booking
  ON public.payment_refunds (booking_id)
  WHERE booking_id IS NOT NULL
    AND status IN ('PENDING', 'SUCCEEDED', 'UNKNOWN', 'MANUAL_REQUIRED');

CREATE INDEX payment_refunds_ticket_idx ON public.payment_refunds (kushki_ticket);
CREATE INDEX payment_refunds_order_idx  ON public.payment_refunds (order_id);

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
-- Sin políticas a propósito: anon y authenticated no leen ni escriben. service_role salta RLS.
-- También se le quita todo a service_role: sus privilegios por defecto en el esquema son arwdDxtm (incluyen DELETE y TRUNCATE).
REVOKE ALL ON TABLE public.payment_refunds FROM PUBLIC, anon, authenticated, service_role;
-- service_role salta RLS pero igual necesita privilegios de tabla. Solo lo que usan las Edge Functions:
-- sin DELETE ni TRUNCATE a propósito (el registro de reembolsos no se borra desde las funciones).
GRANT SELECT, INSERT, UPDATE ON TABLE public.payment_refunds TO service_role;

-- 3) Backfill del incidente del 20-nov (confirmado en la consola de Kushki el 2026-11-25:
--    reembolso parcial de 6.04 USD aprobado el 2026-11-20 01:28:30) -------
INSERT INTO public.payment_refunds
  (booking_id, order_id, kushki_ticket, amount_cents, reason, status, kushki_message)
SELECT b.id, b.order_id, b.kushki_ticket, 604, 'PROVIDER_REJECT', 'SUCCEEDED',
       'Confirmado en consola Kushki 2026-11-25: reembolso parcial 6.04 USD aprobado 2026-11-20'
FROM public.bookings b
WHERE b.id = '443bdfa3-451c-4f0b-a353-43c9e4080542';

-- 4) Verificación: copia y pega este resultado en el chat --------------
SELECT 'funcion_tiene_validacion' AS chequeo,
       (pg_get_functiondef('public.provider_finalize_booking(uuid,integer,text)'::regprocedure)
          LIKE '%Solo puedes finalizar esta reserva desde%')::text AS resultado
UNION ALL
SELECT 'funcion_bloquea_reembolso_vivo',
       (pg_get_functiondef('public.provider_finalize_booking(uuid,integer,text)'::regprocedure)
          LIKE '%cuando no tenga un reembolso en curso%')::text
UNION ALL
SELECT 'grants_finalize',
       (SELECT string_agg(grantee, ',' ORDER BY grantee) FROM information_schema.routine_privileges
        WHERE routine_schema = 'public' AND routine_name = 'provider_finalize_booking' AND privilege_type = 'EXECUTE')
UNION ALL
SELECT 'rls_payment_refunds',
       (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.payment_refunds'::regclass)
UNION ALL
SELECT 'grants_payment_refunds_anon_auth',
       coalesce((SELECT string_agg(grantee || ':' || privilege_type, ',') FROM information_schema.role_table_grants
                 WHERE table_schema = 'public' AND table_name = 'payment_refunds'
                   AND grantee IN ('anon', 'authenticated')), 'ninguno')
UNION ALL
SELECT 'service_role_select', has_table_privilege('service_role', 'public.payment_refunds', 'SELECT')::text
UNION ALL
SELECT 'service_role_insert', has_table_privilege('service_role', 'public.payment_refunds', 'INSERT')::text
UNION ALL
SELECT 'service_role_update', has_table_privilege('service_role', 'public.payment_refunds', 'UPDATE')::text
UNION ALL
SELECT 'service_role_delete', has_table_privilege('service_role', 'public.payment_refunds', 'DELETE')::text
UNION ALL
SELECT 'filas_payment_refunds', (SELECT count(*)::text FROM public.payment_refunds);

COMMIT;

-- Resultado esperado:
--   funcion_tiene_validacion        | true
--   funcion_bloquea_reembolso_vivo  | true
--   grants_finalize                 | authenticated,postgres   (puede aparecer también service_role)
--   rls_payment_refunds             | true
--   grants_payment_refunds_anon_auth| ninguno
--   service_role_select             | true
--   service_role_insert             | true
--   service_role_update             | true
--   service_role_delete             | false
--   filas_payment_refunds           | 1

-- =====================================================================
-- REVERSA DE EMERGENCIA (NO ejecutar salvo emergencia y con OK explícito).
-- Restaura la definición anterior de provider_finalize_booking (sin validación de fecha).
-- La tabla payment_refunds no hace falta borrarla: nadie fuera del servidor la usa.
--
-- CREATE OR REPLACE FUNCTION public.provider_finalize_booking(p_booking_id uuid, p_rating integer DEFAULT NULL::integer, p_comment text DEFAULT NULL::text)
--  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
-- AS $function$
-- declare v_provider_id uuid; v_client_id uuid; v_current_status text; v_conversation_id uuid;
-- begin
--   select pr.id into v_provider_id from public.providers pr where pr.user_id = auth.uid();
--   if v_provider_id is null then raise exception 'No eres proveedor'; end if;
--   select b.client_id, b.status::text into v_client_id, v_current_status
--   from public.bookings b where b.id = p_booking_id and b.provider_id = v_provider_id;
--   if v_client_id is null then raise exception 'Reserva no encontrada o no te pertenece'; end if;
--   if v_current_status not in ('ACTIVE', 'PAID') then raise exception 'Solo puedes finalizar reservas activas'; end if;
--   update public.bookings set status = 'COMPLETED'::public.booking_status where id = p_booking_id;
--   if p_rating is not null then
--     insert into public.reviews (booking_id, author_id, target_id, rating, comment)
--     values (p_booking_id, auth.uid(), v_client_id, p_rating, p_comment);
--   end if;
--   select c.id into v_conversation_id from public.conversations c where c.booking_id = p_booking_id limit 1;
--   if v_conversation_id is not null then
--     insert into public.conversation_deleted (user_id, conversation_id) values (auth.uid(), v_conversation_id) on conflict (user_id, conversation_id) do nothing;
--     insert into public.conversation_deleted (user_id, conversation_id) values (v_client_id, v_conversation_id) on conflict (user_id, conversation_id) do nothing;
--   end if;
-- end; $function$;
-- =====================================================================
