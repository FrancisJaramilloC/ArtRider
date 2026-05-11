"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { getMyProviderId } from "@/services/helpers/getMyProviderId";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Package = {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  daily_price: number;
  is_published: boolean;
  created_at: string;
  items?: PackageItem[];
};

export type PackageItem = {
  id: string;
  package_id: string;
  listing_id: string;
  quantity: number;
};

// ── Read ───────────────────────────────────────────────────────────────────────

export async function getMyPackages(): Promise<Package[]> {
  const providerId = await getMyProviderId();
  if (!providerId) return [];
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("packages")
    .select("*, items:package_items(*)")
    .eq("provider_id", providerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`[packagesService] getMyPackages: ${error.message}`);
  return (data ?? []) as Package[];
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createPackage(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: true; id?: string; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const providerId = await getMyProviderId();
    if (!providerId) return { error: "Debes ser proveedor para crear paquetes." };

    const title       = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const priceRaw    = formData.get("dailyPrice") as string;
    const publishNow  = formData.get("publishNow") === "true";
    const listingIds  = formData.getAll("listingIds") as string[];

    if (!title || title.length < 3)
      return { error: "El titulo debe tener al menos 3 caracteres." };
    if (listingIds.length < 2)
      return { error: "Un paquete debe incluir al menos 2 equipos." };

    const dailyPrice = Math.round(parseFloat(priceRaw) * 100);
    if (isNaN(dailyPrice) || dailyPrice < 100)
      return { error: "El precio minimo es $1.00 por dia." };

    // Verify all listings belong to this owner and are published
    const { data: ownedListings } = await supabase
      .from("listings")
      .select("id")
      .eq("provider_id", providerId)
      .eq("is_published", true)
      .in("id", listingIds)
      .is("deleted_at", null);

    if (!ownedListings || ownedListings.length !== listingIds.length)
      return { error: "Algunos equipos seleccionados no son validos. Solo puedes agregar equipos publicados." };

    // Insert package
    const { data: pkg, error: insertError } = await supabase
      .from("packages")
      .insert({
        provider_id: providerId,
        title,
        description: description || null,
        daily_price: dailyPrice,
        is_published: publishNow,
      })
      .select("id")
      .single();

    if (insertError || !pkg) return { error: "Error al crear el paquete." };

    // Insert package items
    const items = listingIds.map((lid) => ({
      package_id: pkg.id,
      listing_id: lid,
      quantity: 1,
    }));

    const { error: itemsError } = await supabase.from("package_items").insert(items);
    if (itemsError) return { error: "Error al vincular los equipos al paquete." };

    revalidatePath("/provider/catalog");
    return { success: true, id: pkg.id };
  } catch {
    return { error: "Error inesperado. Intenta de nuevo." };
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deletePackage(id: string): Promise<{ error?: string }> {
  const providerId = await getMyProviderId();
  if (!providerId) return { error: "No autenticado." };
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("packages")
    .update({ deleted_at: new Date().toISOString(), is_published: false })
    .eq("id", id)
    .eq("provider_id", providerId);

  if (error) return { error: "Error al eliminar el paquete." };
  revalidatePath("/provider/catalog");
  return {};
}

// ── Toggle publish ─────────────────────────────────────────────────────────────

export async function togglePackagePublish(
  id: string,
  current: boolean
): Promise<{ error?: string }> {
  const providerId = await getMyProviderId();
  if (!providerId) return { error: "No autenticado." };
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("packages")
    .update({ is_published: !current, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("provider_id", providerId);

  if (error) return { error: "Error al cambiar el estado del paquete." };
  revalidatePath("/provider/catalog");
  return {};
}
