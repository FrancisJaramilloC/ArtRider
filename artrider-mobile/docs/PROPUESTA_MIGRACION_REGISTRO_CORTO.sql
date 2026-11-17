-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
-- Contexto: el registro móvil ya no pide teléfono ni fecha de nacimiento. Solo envía en
-- raw_user_meta_data: full_name, age_confirmed y terms_accepted_at.

-- 1) Comprobar si en la base REAL las columnas son obligatorias (en schema.sql del repo son NULL-ables).
--    Si alguna sale is_nullable = 'NO', hay que hacerla opcional (paso 2).
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name IN ('phone', 'birth_date', 'full_name');

-- 2) Solo si el paso 1 mostró 'NO':
-- ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
-- ALTER TABLE public.profiles ALTER COLUMN birth_date DROP NOT NULL;

-- 3) El trigger actual (migración 20260509_security_fixes.sql) solo copia id y email: el nombre que
--    manda el registro NO llega a profiles.full_name. Esta versión lo guarda.
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
