"use server";

import { createSupabaseServerClient } from '@/lib/supabaseServer';
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

    // 3. Execution (Natively protected by Postgres RLS policy)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        birth_date: birthDate,
      })
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
