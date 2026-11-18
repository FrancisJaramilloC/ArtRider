-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
-- Problema: la RLS de `profiles` solo permite leer el perfil propio ("Users can read own profile"),
-- así que un Rider no puede leer `avatar_url` del Partner y su foto nunca carga en el detalle del equipo.
-- Esta función expone SOLO la foto de usuarios que son Partner (nada de teléfono, fecha ni correo).

CREATE OR REPLACE FUNCTION public.get_provider_public_profile(p_user_id uuid)
RETURNS TABLE (avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.avatar_url
  FROM profiles p
  JOIN providers pr ON pr.user_id = p.id
  WHERE p.id = p_user_id
    AND p.deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_public_profile(uuid) TO anon, authenticated;

-- Además, confirmar que el bucket `avatars` es público (la app guarda la URL de getPublicUrl()):
-- SELECT id, public FROM storage.buckets WHERE id = 'avatars';
-- Si public = false, las URLs públicas devuelven error y se vería siempre el avatar de iniciales.
