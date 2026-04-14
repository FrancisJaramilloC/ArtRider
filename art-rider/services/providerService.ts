"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────

export type ProviderProfile = {
  id: string;
  user_id: string;
  brand_name: string;
  bio: string | null;
  status: "pending" | "active" | "suspended";
  created_at: string;
};

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the provider profile for the currently authenticated user.
 * Returns null if the user is not yet registered as a provider.
 */
export async function getMyProviderProfile(): Promise<ProviderProfile | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    // PGRST116 = no rows found — user is not a provider yet
    if (error.code === "PGRST116") return null;
    throw new Error(`[providerService] getMyProviderProfile failed: ${error.message}`);
  }

  return data as ProviderProfile;
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Registers the authenticated user as a provider.
 * Status begins as 'pending' and requires manual admin approval + KYC before
 * the provider can publish listings.
 */
export async function becomeProvider(prevState: any, formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Debes iniciar sesión para registrarte como proveedor." };
    }

    const brandName = (formData.get("brandName") as string)?.trim();
    const bio = (formData.get("bio") as string)?.trim() ?? "";

    // Validations
    if (!brandName) {
      return { error: "El nombre de tu negocio es obligatorio." };
    }
    if (brandName.length < 2 || brandName.length > 80) {
      return { error: "El nombre del negocio debe tener entre 2 y 80 caracteres." };
    }
    if (bio && bio.length > 500) {
      return { error: "La descripción no puede superar los 500 caracteres." };
    }

    // Check if already registered
    const { data: existing } = await supabase
      .from("providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return { error: "Ya tienes un perfil de proveedor registrado." };
    }

    const { error: insertError } = await supabase.from("providers").insert({
      user_id: user.id,
      brand_name: brandName,
      bio: bio || null,
      status: "pending",
    });

    if (insertError) {
      console.error("[providerService] becomeProvider insert error:", insertError);
      return { error: "No se pudo registrar tu perfil. Por favor intenta más tarde." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/become-a-provider");

    return { success: true };
  } catch (error: any) {
    console.error("[providerService] becomeProvider unexpected error:", error);
    return { error: "Ocurrió un error inesperado. Por favor intenta más tarde." };
  }
}
