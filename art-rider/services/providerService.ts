"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

// Tipos de servicio

export type ProviderProfile = {
  id: string;
  user_id: string;
  brand_name: string;
  bio: string | null;
  status: "pending" | "active" | "suspended";
  created_at: string;
};

// Consultas
/**
 * Retorna el perfil del proveedor para el usuario autenticado.
 * Retorna null si el usuario no está registrado como proveedor.
 */
export async function getMyProviderProfile(): Promise<ProviderProfile | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; //comprobar que el usuario este autenticado

  // Obtener el perfil del proveedor
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    // PGRST116 = no rows found — user is not a provider yet
    if (error.code === "PGRST116") return null; //si no se encuentra el proveedor
    throw new Error(`[providerService] getMyProviderProfile failed: ${error.message}`); //error al obtener el perfil
  }

  return data as ProviderProfile;
}

// Crear

/**
 * Registra al usuario autenticado como proveedor.
 * El estado comienza como 'pendiente' y requiere aprobación manual del administrador + KYC antes
 * de que el proveedor pueda publicar equipos.
 */
export async function becomeProvider(prevState: any, formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) { //comprobar que el usuario este autenticado
      return { error: "Debes iniciar sesión para registrarte como proveedor." };
    }

    // Obtener los datos del formulario
    const brandName = (formData.get("brandName") as string)?.trim();
    const bio = (formData.get("bio") as string)?.trim() ?? "";

    // Validaciones
    if (!brandName) { //comprobar que el nombre del negocio no sea nulo
      return { error: "El nombre de tu negocio es obligatorio." };
    }
    if (brandName.length < 2 || brandName.length > 80) { //comprobar que el nombre del negocio tenga entre 2 y 80 caracteres
      return { error: "El nombre del negocio debe tener entre 2 y 80 caracteres." };
    }
    if (bio && bio.length > 500) { //comprobar que la descripcion no supere los 500 caracteres
      return { error: "La descripción no puede superar los 500 caracteres." };
    }

    // Comprobar si el proveedor ya está registrado
    const { data: existing } = await supabase //comprobar que el proveedor no esté registrado
      .from("providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) { //si el proveedor ya está registrado
      return { error: "Ya tienes un perfil de proveedor registrado." };
    }

    // Insertar el perfil del proveedor
    const { error: insertError } = await supabase.from("providers").insert({ //insertar el perfil del proveedor
      user_id: user.id,
      brand_name: brandName,
      bio: bio || null,
      status: "pending",
    });

    if (insertError) { //comprobar si hubo un error al insertar el perfil
      console.error("[providerService] becomeProvider insert error:", insertError);
      return { error: "No se pudo registrar tu perfil. Por favor intenta más tarde." };
    }

    revalidatePath("/dashboard"); //revalidar el path del dashboard
    revalidatePath("/become-a-provider");

    return { success: true };
  } catch (error: any) { //catch de errores inesperados
    console.error("[providerService] becomeProvider unexpected error:", error); 
    return { error: "Ocurrió un error inesperado. Por favor intenta más tarde." };
  }
}


// Actualizar el nombre de la marca del proveedor
export async function updateProviderBrandName(
  newBrandName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient(); //crear el cliente de supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(); //obtener el usuario autenticado

    if (authError || !user) { //comprobar que el usuario este autenticado
      return { success: false, error: "No autenticado." };
    }

    const trimmed = newBrandName.trim(); //recortar el nombre de la marca
    if (!trimmed || trimmed.length < 2 || trimmed.length > 80) {
      return { success: false, error: "El nombre debe tener entre 2 y 80 caracteres." };
    }

    // Actualizar el nombre de la marca del proveedor
    const { error } = await supabase
      .from("providers")
      .update({ brand_name: trimmed })
      .eq("user_id", user.id);

    if (error) { //comprobar si hubo un error al actualizar el nombre
      return { success: false, error: "No se pudo actualizar el nombre." };
    }

    revalidatePath("/provider"); //revalidar el path
    return { success: true };
  } catch { //catch de errores inesperados
    return { success: false, error: "Error inesperado." };
  }
}
