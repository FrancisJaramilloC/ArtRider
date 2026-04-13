"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────

export type Listing = {
  id: string;
  owner_id: string;
  title: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  cover_image_url: string | null;
  daily_price: number;
  description: string | null;
  is_published: boolean;
  created_at: string;
};

const LISTING_SELECT =
  "id, owner_id, title, brand, model, category, cover_image_url, daily_price, description, is_published, created_at";

// ── Read (Public) ─────────────────────────────────────────────────────────────

export async function getListings(): Promise<Listing[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[listingsService] getListings: ${error.message}`);
  return (data ?? []) as Listing[];
}

export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`[listingsService] getListingById: ${error.message}`);
  }
  return data as Listing;
}

// ── Read (Provider) ───────────────────────────────────────────────────────────

export async function getMyListings(): Promise<Listing[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[listingsService] getMyListings: ${error.message}`);
  return (data ?? []) as Listing[];
}

// ── Mutations ────────────────────────────────────────────────────────────────

async function uploadCoverImage(file: File, userId: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}-${Date.now()}.${ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from("listing-covers")
    .upload(fileName, file, { upsert: true, contentType: file.type });
  if (error) { console.error("[listingsService] upload error:", error); return null; }
  const supabase = await createSupabaseServerClient();
  const { data } = supabase.storage.from("listing-covers").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function createListing(prevState: any, formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Debes iniciar sesión." };

    const { data: provider } = await supabase
      .from("providers").select("status").eq("user_id", user.id).single();
    if (!provider) return { error: "Necesitas registrarte como proveedor primero." };
    if (provider.status === "pending") return { error: "Tu cuenta de proveedor está pendiente de aprobación." };
    if (provider.status === "suspended") return { error: "Tu cuenta de proveedor ha sido suspendida." };

    const title = (formData.get("title") as string)?.trim();
    const brand = (formData.get("brand") as string)?.trim();
    const model = (formData.get("model") as string)?.trim();
    const category = formData.get("category") as string;
    const dailyPriceRaw = formData.get("dailyPrice") as string;
    const description = (formData.get("description") as string)?.trim();
    const publishNow = formData.get("publishNow") === "true";

    if (!title || title.length < 3 || title.length > 100)
      return { error: "El título debe tener entre 3 y 100 caracteres." };
    if (!category) return { error: "La categoría es obligatoria." };

    const dailyPrice = Math.round(parseFloat(dailyPriceRaw) * 100);
    if (isNaN(dailyPrice) || dailyPrice < 100) return { error: "El precio mínimo es $1.00 por día." };
    if (dailyPrice > 1000000) return { error: "El precio máximo es $10,000 por día." };

    const coverFile = formData.get("coverImage") as File | null;
    if (coverFile && coverFile.size > 5 * 1024 * 1024)
      return { error: "La imagen no puede superar los 5MB." };

    const coverImageUrl = coverFile ? await uploadCoverImage(coverFile, user.id) : null;

    const { data: newListing, error: insertError } = await supabase
      .from("listings")
      .insert({
        owner_id: user.id, title, brand: brand || null, model: model || null,
        category, cover_image_url: coverImageUrl,
        daily_price: dailyPrice, description: description || null, is_published: publishNow,
      })
      .select("id").single();

    if (insertError) return { error: "Error al guardar el equipo. Intenta de nuevo." };

    revalidatePath("/provider/catalog");
    revalidatePath("/listings");
    return { success: true, id: newListing.id };
  } catch {
    return { error: "Ocurrió un error inesperado." };
  }
}

export async function updateListing(id: string, prevState: any, formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Debes iniciar sesión." };

    const title = (formData.get("title") as string)?.trim();
    const brand = (formData.get("brand") as string)?.trim();
    const model = (formData.get("model") as string)?.trim();
    const category = formData.get("category") as string;
    const dailyPriceRaw = formData.get("dailyPrice") as string;
    const description = (formData.get("description") as string)?.trim();

    if (!title || title.length < 3) return { error: "El título debe tener al menos 3 caracteres." };
    if (!category) return { error: "La categoría es obligatoria." };

    const dailyPrice = Math.round(parseFloat(dailyPriceRaw) * 100);
    if (isNaN(dailyPrice) || dailyPrice < 100) return { error: "El precio mínimo es $1.00." };

    const payload: any = {
      title, brand: brand || null, model: model || null, category,
      daily_price: dailyPrice, description: description || null,
      updated_at: new Date().toISOString(),
    };

    const coverFile = formData.get("coverImage") as File | null;
    if (coverFile && coverFile.size > 0) {
      if (coverFile.size > 5 * 1024 * 1024) return { error: "La imagen no puede superar los 5MB." };
      const url = await uploadCoverImage(coverFile, user.id);
      if (url) payload.cover_image_url = url;
    }

    const { error } = await supabase
      .from("listings").update(payload).eq("id", id).eq("owner_id", user.id);
    if (error) return { error: "Error al actualizar el equipo." };

    revalidatePath("/provider/catalog");
    revalidatePath(`/listings/${id}`);
    return { success: true };
  } catch {
    return { error: "Error inesperado." };
  }
}

export async function togglePublish(id: string, currentState: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };
  const { error } = await supabase.from("listings")
    .update({ is_published: !currentState, updated_at: new Date().toISOString() })
    .eq("id", id).eq("owner_id", user.id);
  if (error) return { error: "Error al cambiar el estado." };
  revalidatePath("/dashboard/listings");
  revalidatePath("/listings");
  return { success: true };
}

export async function deleteListing(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };
  const { error } = await supabase.from("listings")
    .update({ deleted_at: new Date().toISOString(), is_published: false })
    .eq("id", id).eq("owner_id", user.id);
  if (error) return { error: "Error al eliminar." };
  revalidatePath("/dashboard/listings");
  revalidatePath("/listings");
  return { success: true };
}
