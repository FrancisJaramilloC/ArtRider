import { supabase } from './supabase';

export interface UpdateProfileParams {
    fullName: string;
    phone: string;
    /** URI local del archivo (ej. de expo-image-picker), si el usuario cambió su foto */
    avatarUri?: string;
    avatarMimeType?: string;
}

export interface UpdateProfileResult {
    error?: string;
    success?: string;
    /** Tipo de fallo: «permission» y «network» son esperados (sin console.error); en «permission» reintentar no sirve. */
    code?: 'permission' | 'network' | 'unexpected';
}

const PERMISSION_MESSAGE = 'No tienes permiso para subir la foto de perfil. Cierra sesión, vuelve a entrar e inténtalo de nuevo; si sigue igual, contáctanos.';
const NETWORK_MESSAGE = 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.';

const MIME_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
};

/** Extensión y contentType correctos de la foto (según el mime del selector o, si falta, la extensión de la URI). */
function avatarFileInfo(uri: string, mimeType?: string): { ext: string; contentType: string } {
    const mime = (mimeType ?? '').toLowerCase();
    const fromUri = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    const ext = MIME_EXTENSIONS[mime] ?? (/^[a-z0-9]{3,5}$/.test(fromUri) ? fromUri : 'jpg');
    const contentType = mime.startsWith('image/') ? (mime === 'image/jpg' ? 'image/jpeg' : mime) : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    return { ext, contentType };
}

/** Error de la RLS de Storage / permisos (p. ej. «new row violates row-level security policy», 403). */
function isPermissionError(error: { message?: string; statusCode?: string | number; status?: number }): boolean {
    return String(error.statusCode ?? error.status ?? '') === '403' || /row-level security|not authorized|permission denied|unauthorized/i.test(error.message ?? '');
}

function isNetworkError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /network request failed|failed to fetch|network error|timed out|timeout|offline/i.test(message);
}

export async function updateProfile(params: UpdateProfileParams): Promise<UpdateProfileResult> {
    const { fullName, phone, avatarUri, avatarMimeType } = params;

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { error: 'La sesión expiró. Por favor inicia sesión de nuevo.' };
        }

        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('birth_date, avatar_updated_at')
            .eq('id', user.id)
            .single();

        if (!fullName) {
            return { error: 'Por favor completa todos los campos requeridos.' };
        }

        // El teléfono es opcional (el registro ya no lo pide; se solicitará al reservar o al ser Partner).
        const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
        if (phone.trim() && !phoneRegex.test(phone.trim())) {
            return { error: 'El formato de teléfono ingresado es inválido.' };
        }

        let finalAvatarUrl: string | null = null;
        let targetAvatarUpdateTimestamp: string | null = null;

        if (avatarUri) {
            // Cooldown de 24 horas — misma regla que la web
            if (currentProfile?.avatar_updated_at) {
                const lastUpdated = new Date(currentProfile.avatar_updated_at).getTime();
                const differenceInHours = (Date.now() - lastUpdated) / (1000 * 60 * 60);
                if (differenceInHours < 24) {
                    return { error: 'Solo puedes cambiar tu foto de perfil una vez cada 24 horas.' };
                }
            }

            // React Native no tiene File — leemos el archivo local como ArrayBuffer
            // para subirlo a Supabase Storage.
            const response = await fetch(avatarUri);
            const arrayBuffer = await response.arrayBuffer();

            if (arrayBuffer.byteLength > 2 * 1024 * 1024) {
                return { error: 'La foto no puede superar los 2MB permitidos.' };
            }

            // Ruta `<user_id>/<archivo>`: la primera carpeta es el id del usuario, que es lo que exigen las políticas
            // de Storage por carpeta propia (ver docs/PROPUESTA_POLITICAS_STORAGE_AVATARES.sql). El nombre lleva la
            // fecha, así que es único y no hace falta `upsert` (que además exigiría política de UPDATE).
            const { ext, contentType } = avatarFileInfo(avatarUri, avatarMimeType);
            const fileName = `${user.id}/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, arrayBuffer, { contentType, upsert: false });

            if (uploadError) {
                // Permisos y red son errores esperados: console.warn (console.error abre el cuadro rojo en desarrollo).
                if (isPermissionError(uploadError)) {
                    console.warn('No se pudo subir la foto (permisos de Storage):', uploadError.message);
                    return { error: PERMISSION_MESSAGE, code: 'permission' };
                }
                if (isNetworkError(uploadError)) {
                    console.warn('No se pudo subir la foto (red):', uploadError.message);
                    return { error: NETWORK_MESSAGE, code: 'network' };
                }
                console.error('Error al subir la imagen:', uploadError);
                return { error: 'Error al subir la imagen. Intenta de nuevo.', code: 'unexpected' };
            }

            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            finalAvatarUrl = publicUrlData.publicUrl;
            targetAvatarUpdateTimestamp = new Date().toISOString();
        }

        const updatePayload: Record<string, any> = {
            full_name: fullName.trim(),
            // `phone` es UNIQUE: vacío se guarda como NULL, no como cadena vacía.
            phone: phone.trim() || null,
        };

        if (finalAvatarUrl && targetAvatarUpdateTimestamp) {
            updatePayload.avatar_url = finalAvatarUrl;
            updatePayload.avatar_updated_at = targetAvatarUpdateTimestamp;
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id);

        if (updateError) {
            if (updateError.code === '42501') {
                console.warn('Sin permiso para actualizar el perfil:', updateError.message);
                return { error: 'No tienes permiso para actualizar este perfil. Cierra sesión y vuelve a entrar.', code: 'permission' };
            }
            console.error('Error al actualizar el perfil:', updateError);
            if (updateError.code === '23505' && updateError.message.includes('phone')) {
                return { error: 'Este número de teléfono ya está registrado con otra cuenta.' };
            }
            return { error: 'Error guardando tu perfil. Por favor intenta más tarde.' };
        }

        return { success: '¡Perfil actualizado exitosamente!' };
    } catch (error: unknown) {
        if (isNetworkError(error)) {
            console.warn('Sin conexión al actualizar el perfil:', error instanceof Error ? error.message : error);
            return { error: NETWORK_MESSAGE, code: 'network' };
        }
        console.error('Error técnico al actualizar el perfil:', error);
        return { error: 'Ocurrió un error inesperado al conectar con el servidor.', code: 'unexpected' };
    }
}

/** El campo `avatar_url` guarda la URL pública completa; si llegara solo la ruta en el bucket `avatars`, se construye. */
function resolveAvatarUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    return supabase.storage.from('avatars').getPublicUrl(value).data.publicUrl;
}

/**
 * Foto del Partner para el detalle de un equipo (best-effort: nunca lanza; devuelve null si no hay foto o no se puede leer).
 * 1) RPC `get_provider_public_profile` (SECURITY DEFINER; ver docs/PROPUESTA_PERFIL_PUBLICO_PARTNER.sql).
 * 2) Lectura directa de `profiles`: la RLS actual solo permite leer el perfil propio, así que para otros usuarios no devuelve filas.
 */
export async function getProviderAvatarUrl(userId: string): Promise<string | null> {
    try {
        const { data, error } = await supabase.rpc('get_provider_public_profile', { p_user_id: userId });
        if (!error) {
            const row = Array.isArray(data) ? data[0] : data;
            return resolveAvatarUrl(row?.avatar_url);
        }
    } catch {
        // Sin la función en la base: se prueba la lectura directa.
    }
    try {
        const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
        return resolveAvatarUrl(data?.avatar_url);
    } catch {
        return null;
    }
}
