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

        if (!fullName || !phone) {
            return { error: 'Por favor completa todos los campos requeridos.' };
        }

        const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
        if (!phoneRegex.test(phone)) {
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
            phone: phone.trim(),
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