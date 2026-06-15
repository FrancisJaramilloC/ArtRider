"use server";

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function updateProfile(prevState: any, formData: FormData) {
  try {
    // Cliente de Supabase
    const supabase = await createSupabaseServerClient();
    
    // Seguridad: Operar solo contra el límite de token JWT inherentemente validado.
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Error al obtener el usuario
    if (authError || !user) {
      return { error: 'Authentication failed. Please log in again.' };
    }

    // Obtiene los datos del formulario
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    let birthDate = formData.get('birthDate') as string;

    // Explicit Data Fetch mapping constraints isolating historical variables cleanly
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('birth_date, avatar_updated_at')
      .eq('id', user.id)
      .single();

    // Re-inyeccion de datos inmutables si está presente para omitir comprobaciones vacías de datos falsos positivos de entradas DOM deshabilitadas
    if (currentProfile?.birth_date) {
      birthDate = currentProfile.birth_date;
    }

    // 1. Comprobaciones vacías básicas y asignación estricta
    if (!fullName || !phone || !birthDate) {
      return { error: 'Por favor completa todos los campos requeridos.' };
    }

    const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return { error: 'El formato de teléfono ingresado es inválido.' };
    }

    // 2. Restricciones de lógica de negocio estrictas: Edad mínima absoluta de 18 años
    const dob = new Date(birthDate);
    const today = new Date();
    
    // Calcular edad precisa contabilizando años bisiestos y diferencias de mes específicas
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return { error: 'Por motivos de seguridad, debes ser mayor de 18 años para utilizar esta plataforma.' };
    }

    // 3. Validación de almacenamiento y pipeline de carga (cooldown de 24 horas)
    const avatarFile = formData.get('avatarFile') as File | null;
    let finalAvatarUrl = null;
    let targetAvatarUpdateTimestamp = null;

    //  Si el archivo ha sido modificado
    if (avatarFile && avatarFile.size > 0) {
      // Si el perfil tiene una fecha de actualización
      if (currentProfile?.avatar_updated_at) {
        const lastUpdated = new Date(currentProfile.avatar_updated_at).getTime();
        const differenceInHours = (Date.now() - lastUpdated) / (1000 * 60 * 60);

        // Si han pasado menos de 24 horas
        if (differenceInHours < 24) {
          return { error: 'Seguridad: Solo puedes cambiar tu foto de perfil una vez cada 24 horas.' };
        }
      }

      // Si el archivo es mayor a 2MB
      if (avatarFile.size > 2 * 1024 * 1024) {
        return { error: 'La foto no puede superar los 2MB permitidos por seguridad.' };
      }
      
      // Genera el nombre del archivo
      const fileExt = avatarFile.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Sube el archivo a Storage usando el cliente de administración
      const supabaseAdmin = createSupabaseAdminClient();
      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true, contentType: avatarFile.type });

      if (uploadError) {
        console.error('Error al subir la imagen:', uploadError);
        return { error: 'Error al subir la imagen. Verifica que el Bucket "avatars" exista y sea público en Supabase.' };
      }

      // Obtiene la URL pública del archivo
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      finalAvatarUrl = publicUrlData.publicUrl;
      targetAvatarUpdateTimestamp = new Date().toISOString();
    }

    // 4. Ejecución (protegido por la política de RLS de Postgres)
    const updatePayload: any = {
      full_name: fullName.trim(),
      phone: phone.trim(),
    };

    // Límite inmutable: Solo ejecuta sobrescrituras de fecha de nacimiento si está históricamente vacante.
    if (!currentProfile?.birth_date) {
      updatePayload.birth_date = birthDate;
    }

    // Si el archivo ha sido modificado
    if (finalAvatarUrl && targetAvatarUpdateTimestamp) {
      updatePayload.avatar_url = finalAvatarUrl;
      updatePayload.avatar_updated_at = targetAvatarUpdateTimestamp;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id); // Protección adicional para asegurar que la mutación se bloquee al token JWT

    if (updateError) {
      console.error('Error al actualizar el perfil:', updateError);
      
      // Maneja la violación de restricción única (Código de Postgres 23505)
      if (updateError.code === '23505' && updateError.message.includes('phone')) {
        return { error: 'Este número de teléfono ya está registrado con otra cuenta.' };
      }

      return { error: 'Error interno guardando tu perfil. Por favor intenta más tarde.' };
    }

    // Limpia el caché obsoleto del router recargando de forma segura los payloads dinámicos
    revalidatePath('/profile');
    
    return { success: '¡Perfil actualizado exitosamente!' };

  } catch (error: any) {
    console.error('Error técnico al actualizar el perfil:', error);
    return { error: 'Ocurrió un error inesperado al conectar con el servidor.' };
  }
}
