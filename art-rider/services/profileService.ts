"use server";

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function updateProfile(prevState: any, formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Security: Only operate against the inherently validated JWT token boundary.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'Authentication failed. Please log in again.' };
    }

    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const birthDate = formData.get('birthDate') as string;

    // 1. Basic empty checks
    if (!fullName || !phone || !birthDate) {
      return { error: 'Por favor completa todos los campos requeridos.' };
    }

    // 2. Strict Business Logic Constraint: Absolute Age Minimum 18+
    const dob = new Date(birthDate);
    const today = new Date();
    
    // Calculate accurate age accounting for leap years and specific month differences
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return { error: 'Por motivos de seguridad, debes ser mayor de 18 años para utilizar esta plataforma.' };
    }

    // 3. Storage Validation & Upload Pipeline
    const avatarFile = formData.get('avatarFile') as File | null;
    let finalAvatarUrl = null;

    if (avatarFile && avatarFile.size > 0) {
      if (avatarFile.size > 2 * 1024 * 1024) {
        return { error: 'La foto no puede superar los 2MB permitidos por seguridad.' };
      }
      
      const fileExt = avatarFile.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Elevate mapping to Admin Client exclusively over Storage buffers safely avoiding UI-dependent Storage RLS errors
      const supabaseAdmin = createSupabaseAdminClient();
      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true, contentType: avatarFile.type });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        return { error: 'Error al subir la imagen. Verifica que el Bucket "avatars" exista y sea público en Supabase.' };
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      finalAvatarUrl = publicUrlData.publicUrl;
    }

    // 4. Execution (Natively protected by Postgres RLS policy)
    const updatePayload: any = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      birth_date: birthDate,
    };

    if (finalAvatarUrl) {
      updatePayload.avatar_url = finalAvatarUrl;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id); // Explicit double-protection ensuring mutation locks to JWT token

    if (updateError) {
      console.error('Update Profile Error:', updateError);
      return { error: 'Error interno guardando tu perfil. Por favor intenta más tarde.' };
    }

    // Clear stale router cache safely reloading dynamic payloads
    revalidatePath('/profile');
    
    return { success: '¡Perfil actualizado exitosamente!' };

  } catch (error: any) {
    console.error('Technical boundaries breached during profile update:', error);
    return { error: 'Ocurrió un error inesperado al conectar con el servidor.' };
  }
}
