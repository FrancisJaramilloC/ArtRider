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

            const ext = avatarMimeType?.split('/')[1] || 'jpg';
            const fileName = `${user.id}-${Date.now()}.${ext}`;

            // El nombre debe empezar con el user.id — así lo exige la política
            // "avatars_insert_own" que creamos en Supabase.
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, arrayBuffer, {
                    contentType: avatarMimeType || 'image/jpeg',
                    upsert: true,
                });

            if (uploadError) {
                console.error('Error al subir la imagen:', uploadError);
                return { error: 'Error al subir la imagen. Intenta de nuevo.' };
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
            console.error('Error al actualizar el perfil:', updateError);
            if (updateError.code === '23505' && updateError.message.includes('phone')) {
                return { error: 'Este número de teléfono ya está registrado con otra cuenta.' };
            }
            return { error: 'Error guardando tu perfil. Por favor intenta más tarde.' };
        }

        return { success: '¡Perfil actualizado exitosamente!' };
    } catch (error: any) {
        console.error('Error técnico al actualizar el perfil:', error);
        return { error: 'Ocurrió un error inesperado al conectar con el servidor.' };
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
