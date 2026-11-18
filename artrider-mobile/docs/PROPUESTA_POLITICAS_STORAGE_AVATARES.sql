-- PROPUESTA — NO APLICADA. Revisar y ejecutar manualmente en Supabase (SQL editor) si se aprueba.
--
-- Contexto: la app móvil sube la foto de perfil con la sesión del usuario (no con service_role) al bucket
-- `avatars`, en la ruta `<user_id>/<timestamp>.<ext>`, y guarda la URL de getPublicUrl() en profiles.avatar_url.
-- El repo no define ninguna política sobre storage.objects (la web sube con service_role y se las salta).

-- ─────────────────────────────────────────────────────────────────────────
-- 1) VERIFICAR el estado actual (solo lectura)
-- ─────────────────────────────────────────────────────────────────────────

-- ¿Existe el bucket y es público? (public = false hace que getPublicUrl() devuelva URLs que no cargan)
SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'avatars';

-- Políticas actuales que afectan a storage.objects (revisar cuáles mencionan 'avatars' y su condición).
SELECT policyname, cmd, roles, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) POLÍTICAS MÍNIMAS PROPUESTAS
--    - Lectura pública solo del bucket de avatares.
--    - INSERT / UPDATE / DELETE únicamente dentro de la carpeta propia (<auth.uid()>/…) de un usuario autenticado.
--    Si ya existen políticas con estos nombres (o equivalentes que choquen), eliminarlas antes con DROP POLICY.
-- ─────────────────────────────────────────────────────────────────────────

-- Bucket público (solo si el paso 1 mostró public = false o no existe):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
-- ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Nota: las fotos antiguas subidas por la web están en la raíz (`<user_id>-<timestamp>.<ext>`); la lectura pública
-- las cubre, pero el usuario no podrá borrarlas/actualizarlas desde la app (no están en su carpeta). No es necesario.
