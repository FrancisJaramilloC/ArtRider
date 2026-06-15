"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { getMyProviderId } from "@/services/helpers/getMyProviderId";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Package = {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  daily_price: number;
  is_published: boolean;
  cover_image_url: string | null;
  gallery_images: string[] | null;
  created_at: string;
  items?: PackageItem[];
};

export type PackageItem = {
  id: string;
  package_id: string;
  listing_id: string;
  quantity: number;
};

/** Tipo enriquecido para la vista de detalle público */
export type PackageWithItems = Omit<Package, "items"> & {
  items: (PackageItem & {
    listing: {
      id: string;
      title: string | null;
      brand: string | null;
      model: string | null;
      category: string | null;
      cover_image_url: string | null;
      daily_price: number;
      address_id?: string | null;
      address?: {
        latitude: number;
        longitude: number;
        city: string;
        state: string;
      } | null;
    } | null;
  })[];
  provider: { brand_name: string; created_at: string } | null;
};

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Normaliza el objeto raw devuelto por Supabase para un paquete con items.
 * - provider puede llegar como array por el join
 * - items[].listing.address puede llegar como array por el join anidado
 */
function normalizePackageData(raw: any): PackageWithItems {
  const provider = Array.isArray(raw.provider)
    ? (raw.provider[0] ?? null)
    : (raw.provider ?? null);

  const items = (raw.items ?? []).map((item: any) => {
    if (!item.listing) return item;
    const rawListing = item.listing;
    const address = Array.isArray(rawListing.address)
      ? (rawListing.address[0] ?? null)
      : (rawListing.address ?? null);
    return { ...item, listing: { ...rawListing, address } };
  });

  return { ...raw, provider, items } as PackageWithItems;
}

/**
 * Sube un archivo de imagen al bucket "listing-covers".
 * Retorna la URL pública o null si falla.
 */
async function uploadPackageFile(file: File, userId: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `pkg-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from("listing-covers")
    .upload(fileName, file, { upsert: true, contentType: file.type });
  if (error) {
    console.error("[packagesService] uploadPackageFile error:", error.message);
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = supabase.storage.from("listing-covers").getPublicUrl(fileName);
  return data.publicUrl;
}

/** Alias para portada — mantiene compatibilidad con el nombre anterior. */
const uploadPackageCover = uploadPackageFile;

/** Sube hasta 5 imágenes de galería adicionales para un paquete. */
async function uploadPackageGallery(files: File[], userId: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files.slice(0, 5)) {
    if (!file || file.size === 0 || file.size > 5 * 1024 * 1024) continue;
    const url = await uploadPackageFile(file, userId);
    if (url) urls.push(url);
  }
  return urls;
}

// ─── Consultas ────────────────────────────────────────────────────────────────

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

/**
 * Obtiene un paquete del proveedor autenticado (no requiere is_published).
 * Usado en el flujo de edición del panel de proveedor.
 */
export async function getMyPackageById(id: string): Promise<PackageWithItems | null> {
  const providerId = await getMyProviderId();
  if (!providerId) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("packages")
    .select(`
      *,
      items:package_items(
        *,
        listing:listings(id, title, brand, model, category, cover_image_url, daily_price, address_id, address:addresses(latitude, longitude, city, state))
      ),
      provider:providers(brand_name, created_at)
    `)
    .eq("id", id)
    .eq("provider_id", providerId)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[packagesService] getMyPackageById:", error.message);
    return null;
  }
  return normalizePackageData(data);
}

/**
 * Obtiene un paquete publicado por su ID junto con sus equipos y proveedor.
 * Usa admin client para evitar bloqueos RLS en el JOIN a listings.
 */
export async function getPackageById(id: string): Promise<PackageWithItems | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("packages")
    .select(`
      *,
      items:package_items(
        *,
        listing:listings(id, title, brand, model, category, cover_image_url, daily_price, address_id, address:addresses(latitude, longitude, city, state))
      ),
      provider:providers(brand_name, created_at)
    `)
    .eq("id", id)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`[packagesService] getPackageById: ${error.message}`);
  }

  return normalizePackageData(data);
}

// ─── Mutaciones ───────────────────────────────────────────────────────────────

// Crear

/**
 * Crea un nuevo paquete con los equipos especificados.
 */
export async function createPackage(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: true; id?: string; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const providerId = await getMyProviderId();
    if (!providerId) return { error: "Debes ser proveedor para crear paquetes." }; //comprobar que el usuario sea proveedor

    const title       = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const priceRaw    = formData.get("dailyPrice") as string;
    const publishNow  = formData.get("publishNow") === "true";
    const listingIds  = formData.getAll("listingIds") as string[];
    const coverFile   = formData.get("coverImage") as File | null;

    // Validación de datos
    if (!title || title.length < 3)
      return { error: "El titulo debe tener al menos 3 caracteres." };
    if (!coverFile || coverFile.size === 0)
      return { error: "La foto de portada del paquete es obligatoria." };
    if (coverFile.size > 5 * 1024 * 1024)
      return { error: "La imagen no puede superar los 5 MB." };
    if (listingIds.length < 2)
      return { error: "Un paquete debe incluir al menos 2 equipos." };

    const dailyPrice = Math.round(parseFloat(priceRaw) * 100);
    if (isNaN(dailyPrice) || dailyPrice < 100)
      return { error: "El precio minimo es $1.00 por dia." };

    // Verificar que todos los equipos pertenezcan al proveedor y estén publicados
    const { data: ownedListings } = await supabase
      .from("listings")
      .select("id")
      .eq("provider_id", providerId)
      .eq("is_published", true)
      .in("id", listingIds)
      .is("deleted_at", null);

    if (!ownedListings || ownedListings.length !== listingIds.length)
      return { error: "Algunos equipos seleccionados no son validos. Solo puedes agregar equipos publicados." };

    // Subir portada — reutilizar el supabase ya instanciado para obtener user
    const { data: { user } } = await supabase.auth.getUser();
    const coverImageUrl = user ? await uploadPackageCover(coverFile, user.id) : null;

    // Subir galería adicional (opcional, máx. 5)
    const galleryFiles = formData.getAll("galleryImages") as File[];
    const galleryImageUrls = user ? await uploadPackageGallery(galleryFiles, user.id) : [];

    // Insertar paquete
    const { data: pkg, error: insertError } = await supabase
      .from("packages")
      .insert({
        provider_id: providerId,
        title,
        description: description || null,
        daily_price: dailyPrice,
        is_published: publishNow,
        ...(coverImageUrl !== null ? { cover_image_url: coverImageUrl } : {}),
        // gallery_images pendiente hasta migración 002
        // ...(galleryImageUrls.length > 0 ? { gallery_images: galleryImageUrls } : {}),
      })
      .select("id")
      .single();

    if (insertError || !pkg) {
      console.error("[packagesService] createPackage insert error:", insertError?.message);
      return { error: `Error al crear el paquete: ${insertError?.message ?? "desconocido"}` };
    }

    // Insertar items del paquete.
    // Usamos el cliente admin para evitar que la política RLS de package_items
    // (que valida ownership via JOIN providers→packages) bloquee el INSERT.
    // La autorización ya fue verificada arriba (getMyProviderId + ownedListings check).
    const admin = createSupabaseAdminClient();
    const items = listingIds.map((lid) => ({
      package_id: pkg.id,
      listing_id: lid,
      quantity: 1,
    }));

    const { error: itemsError } = await admin.from("package_items").insert(items);
    if (itemsError) {
      // Rollback: eliminar el paquete huérfano para no dejar basura en la BD
      await admin.from("packages").delete().eq("id", pkg.id);
      console.error("[packagesService] createPackage items error:", itemsError.message);
      return { error: "Error al vincular los equipos. Por favor intenta de nuevo." };
    }

    revalidatePath("/provider/catalog");
    return { success: true, id: pkg.id };
  } catch (e) {
    console.error("[packagesService] createPackage unexpected error:", e);
    return { error: "Error inesperado. Intenta de nuevo." };
  }
}

// Actualizar

/**
 * Actualiza un paquete existente del proveedor autenticado.
 * La imagen de portada es opcional al editar: si no se sube nueva,
 * se conserva la URL anterior.
 */
export async function updatePackage(
  id: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: true; error?: string }> {
  try {
    const supabase   = await createSupabaseServerClient();
    const providerId = await getMyProviderId();
    if (!providerId) return { error: "Debes ser proveedor para editar paquetes." };

    // Verificar propiedad
    const { data: existing, error: fetchErr } = await supabase
      .from("packages")
      .select("id, cover_image_url")
      .eq("id", id)
      .eq("provider_id", providerId)
      .is("deleted_at", null)
      .single();
    if (fetchErr || !existing) return { error: "Paquete no encontrado o sin permisos." };

    const title       = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const priceRaw    = formData.get("dailyPrice") as string;
    const publishNow  = formData.get("publishNow") === "true";
    const listingIds  = formData.getAll("listingIds") as string[];
    const coverFile   = formData.get("coverImage") as File | null;

    if (!title || title.length < 3) return { error: "El titulo debe tener al menos 3 caracteres." };
    if (listingIds.length < 2) return { error: "Un paquete debe incluir al menos 2 equipos." };

    const dailyPrice = Math.round(parseFloat(priceRaw) * 100);
    if (isNaN(dailyPrice) || dailyPrice < 100) return { error: "El precio minimo es $1.00 por dia." };

    // Verificar que los listados sean válidos para este proveedor
    const { data: ownedListings } = await supabase
      .from("listings")
      .select("id")
      .eq("provider_id", providerId)
      .eq("is_published", true)
      .in("id", listingIds)
      .is("deleted_at", null);
    if (!ownedListings || ownedListings.length !== listingIds.length)
      return { error: "Algunos equipos seleccionados no son validos." };

    // Subir nueva portada si se proporcionó
    const { data: { user } } = await supabase.auth.getUser();
    let coverImageUrl: string | null = existing.cover_image_url ?? null;
    if (coverFile && coverFile.size > 0) {
      if (coverFile.size > 5 * 1024 * 1024) return { error: "La imagen no puede superar los 5 MB." };
      const uploaded = user ? await uploadPackageCover(coverFile, user.id) : null;
      if (uploaded) coverImageUrl = uploaded;
    }

    // Subir nuevas imágenes de galería si se enviaron
    const galleryFiles = formData.getAll("galleryImages") as File[];
    const validGallery = galleryFiles.filter((f) => f && f.size > 0);
    // gallery_images pendiente hasta migración 002 — descomentar cuando esté ejecutada
    // let galleryUpdate: Record<string, unknown> = {};
    // if (validGallery.length > 0 && user) {
    //   const urls = await uploadPackageGallery(validGallery, user.id);
    //   if (urls.length > 0) galleryUpdate = { gallery_images: urls };
    // }

    // Actualizar paquete con admin client para evitar problemas de RLS en UPDATE
    const admin = createSupabaseAdminClient();
    const { error: updateError } = await admin
      .from("packages")
      .update({
        title,
        description: description || null,
        daily_price: dailyPrice,
        is_published: publishNow,
        cover_image_url: coverImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("provider_id", providerId);

    if (updateError) {
      console.error("[packagesService] updatePackage:", updateError.message);
      return { error: `Error al actualizar el paquete: ${updateError.message}` };
    }

    // Reemplazar items: borrar todos, reinsertar los nuevos
    await admin.from("package_items").delete().eq("package_id", id);
    const items = listingIds.map((lid) => ({ package_id: id, listing_id: lid, quantity: 1 }));
    const { error: itemsError } = await admin.from("package_items").insert(items);
    if (itemsError) {
      console.error("[packagesService] updatePackage items:", itemsError.message);
      return { error: "Error al actualizar los equipos del paquete." };
    }

    revalidatePath("/provider/catalog");
    revalidatePath(`/packages/${id}`);
    return { success: true };
  } catch (e) {
    console.error("[packagesService] updatePackage unexpected:", e);
    return { error: "Error inesperado. Intenta de nuevo." };
  }
}

// Eliminar

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

// Cambiar estado de publicacion

export async function togglePackagePublish(
  id: string,
  current: boolean
): Promise<{ error?: string }> {
  const providerId = await getMyProviderId();
  if (!providerId) return { error: "No autenticado." }; //comprobar que el usuario sea proveedor
  const supabase = await createSupabaseServerClient();

  // Actualizar el estado del paquete
  const { error } = await supabase
    .from("packages")
    .update({ is_published: !current, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("provider_id", providerId);

  // Manejar errores
  if (error) return { error: "Error al cambiar el estado del paquete." }; 
  //revalidar el path
  revalidatePath("/provider/catalog");
  return {};
}
