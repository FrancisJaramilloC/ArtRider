"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { getMyProviderId } from "@/services/helpers/getMyProviderId";

//  Tipos del listing
export type Listing = {
  id: string;
  provider_id: string;
  title: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  cover_image_url: string | null;
  gallery_images: string[] | null;
  daily_price: number;
  description: string | null;
  is_published: boolean;
  availability_status: "available" | "maintenance" | "private_use";
  created_at: string;
  address_id?: string | null;
  address?: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
  } | null;
};

//  Selecciona los listings
const LISTING_SELECT =
  "id, provider_id, title, brand, model, category, cover_image_url, gallery_images, daily_price, description, is_published, availability_status, created_at, address_id, address:addresses(latitude, longitude, city, state)";

//  Lee los listings publicados y no eliminados
//  El cliente admin se usa aquí para que el join con addresses no esté bloqueado por RLS.
//  La política de la tabla addresses solo permite a los propietarios leer sus propias filas,
//  lo que significa que las solicitudes anónimas/de otros usuarios obtienen null para el join de direcciones.
//  Estas funciones solo devuelven listings publicados y no eliminados, por lo que es seguro omitir.
function normalizeListingAddress(raw: any): Listing {
  const address = Array.isArray(raw.address)
    ? raw.address[0] ?? null
    : raw.address ?? null;
  return { ...raw, address };
}

//  Selecciona todos los listings publicados y no eliminados
export async function getListings(): Promise<Listing[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[listingsService] getListings: ${error.message}`);
  return (data ?? []).map(normalizeListingAddress);
}

//  Selecciona un listing por su ID
export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = createSupabaseAdminClient();
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
  return normalizeListingAddress(data);
}

//  Lee los listings del proveedor autenticado
export async function getMyListings(): Promise<Listing[]> {
  const providerId = await getMyProviderId();
  if (!providerId) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("provider_id", providerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(`[listingsService] getMyListings: ${error.message}`);
  return (data ?? []).map(normalizeListingAddress);
}

//  Funciones de mutate

//  Sube la imagen de portada del listing
async function uploadCoverImage(
  file: File,
  userId: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}-${Date.now()}.${ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from("listing-covers")
    .upload(fileName, file, { upsert: true, contentType: file.type });
  if (error) {
    console.error("[listingsService] upload error:", error);
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = supabase.storage
    .from("listing-covers")
    .getPublicUrl(fileName);
  return data.publicUrl;
}

/** Sube hasta 5 imágenes de galería adicionales. Retorna un array de URLs públicas. */
async function uploadGalleryImages(files: File[], userId: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files.slice(0, 5)) {
    if (!file || file.size === 0 || file.size > 5 * 1024 * 1024) continue;
    const url = await uploadCoverImage(file, userId);
    if (url) urls.push(url);
  }
  return urls;
}

//  Crea un nuevo listing
export async function createListing(prevState: any, formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Debes iniciar sesión." }; // Error al obtener el usuario autenticado

    const { data: provider } = await supabase
      .from("providers").select("id, status").eq("user_id", user.id).single();
    if (!provider) return { error: "Necesitas registrarte como proveedor primero." }; // Error al obtener el proveedor
    if (provider.status === "pending") return { error: "Tu cuenta de proveedor está pendiente de aprobación." }; // El proveedor no está aprobado
    if (provider.status === "suspended") return { error: "Tu cuenta de proveedor ha sido suspendida." }; // El proveedor está suspendido

    // Extrae los datos del formulario
    const title = (formData.get("title") as string)?.trim();
    const brand = (formData.get("brand") as string)?.trim();
    const model = (formData.get("model") as string)?.trim();
    const category = formData.get("category") as string;
    const dailyPriceRaw = formData.get("dailyPrice") as string;
    const description = (formData.get("description") as string)?.trim();
    const publishNow = formData.get("publishNow") === "true";

    // Datos de la dirección
    const city = (formData.get("city") as string)?.trim() || null;
    const state = (formData.get("state") as string)?.trim() || null;
    const latitudeRaw = formData.get("latitude") as string;
    const longitudeRaw = formData.get("longitude") as string;

    // Validación de los datos del formulario
    if (!title || title.length < 3 || title.length > 100)
      return { error: "El título debe tener entre 3 y 100 caracteres." }; // Error al validar el título
    if (!brand) return { error: "La marca es obligatoria." }; // La marca es obligatoria
    if (!category) return { error: "La categoría es obligatoria." }; // La categoría es obligatoria
    if (!city) return { error: "La ciudad es obligatoria." }; // La ciudad es obligatoria
    if (!state) return { error: "La provincia o estado es obligatorio." };

    // Validación del precio
    const dailyPrice = Math.round(parseFloat(dailyPriceRaw) * 100); // Convierte el precio a centavos
    if (isNaN(dailyPrice) || dailyPrice < 100)
      return { error: "El precio mínimo es $1.00 por día." }; // El precio mínimo es $1.00 por día
    if (dailyPrice > 1000000)
      return { error: "El precio máximo es $10,000 por día." }; // El precio máximo es $10,000 por día

    // Validación de la imagen de portada
    const coverFile = formData.get("coverImage") as File | null;
    if (!coverFile || coverFile.size === 0)
      return { error: "La foto del equipo es obligatoria." }; // La foto del equipo es obligatoria
    if (coverFile.size > 5 * 1024 * 1024)
      return { error: "La imagen no puede superar los 5MB." }; // La imagen no puede superar los 5MB

    // Sube la imagen de portada
    const coverImageUrl = await uploadCoverImage(coverFile, user.id);

    // Sube imágenes de galería adicionales (opcionales, máx. 5)
    const galleryFiles = formData.getAll("galleryImages") as File[];
    const galleryImageUrls = await uploadGalleryImages(galleryFiles, user.id);

    // Dirección del listing
    const latitude = latitudeRaw ? parseFloat(latitudeRaw) : null;
    const longitude = longitudeRaw ? parseFloat(longitudeRaw) : null;

    // Payload de la dirección
    const addressPayload: Record<string, unknown> = {
      user_id: user.id,
      line1: city,
      city,
      state,
      postal_code: "000000",
      country: "EC",
      latitude: latitude != null && !isNaN(latitude) && latitude !== 0 ? latitude : null,
      longitude: longitude != null && !isNaN(longitude) && longitude !== 0 ? longitude : null,
    };

    // Crea la dirección
    const { data: newAddress, error: addrError } = await supabase
      .from("addresses")
      .insert(addressPayload)
      .select("id")
      .single();
    
    // Error al crear la dirección
    if (addrError || !newAddress) {
      console.error("[listingsService] addresses insert error:", addrError);
      return { error: "Error al guardar la ubicación. Intenta de nuevo." };
    }

    // ID de la dirección
    const addressId = newAddress.id;

    // Crea el listing
    const { data: newListing, error: insertError } = await supabase
      .from("listings")
      .insert({
        provider_id: provider.id, title, brand, model: model || null,
        category, cover_image_url: coverImageUrl,
        gallery_images: galleryImageUrls.length > 0 ? galleryImageUrls : null,
        daily_price: dailyPrice, description: description || null, is_published: publishNow,
        address_id: addressId,
      })
      .select("id")
      .single();

    // Error al crear el listing
    if (insertError) {
      console.error("[listingsService] listings insert error:", insertError);
      return { error: "Error al guardar el equipo. Intenta de nuevo." };
    }

    // Revalida las rutas para que se actualicen los datos
    revalidatePath("/provider/catalog");
    revalidatePath("/listings");
    revalidatePath("/map");
    return { success: true, id: newListing.id };
  } catch (err) {
    console.error("[listingsService] createListing unexpected error:", err);
    return { error: "Ocurrió un error inesperado." };
  }
}

// Actualiza un listing
export async function updateListing(
  id: string,
  prevState: any,
  formData: FormData,
) {
  try {
    // Crea el cliente de Supabase
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    // Error al obtener el usuario autenticado
    
    if (authError || !user) return { error: "Debes iniciar sesión." };

    const title = (formData.get("title") as string)?.trim();
    const brand = (formData.get("brand") as string)?.trim();
    const model = (formData.get("model") as string)?.trim();
    const category = formData.get("category") as string;
    const dailyPriceRaw = formData.get("dailyPrice") as string;
    const description = (formData.get("description") as string)?.trim();

    // Datos de la dirección
    const city = (formData.get("city") as string)?.trim() || null;
    const state = (formData.get("state") as string)?.trim() || null;
    const latitudeRaw = formData.get("latitude") as string;
    const longitudeRaw = formData.get("longitude") as string;

    // Validación de los datos
    if (!title || title.length < 3)
      return { error: "El título debe tener al menos 3 caracteres." };
    if (!category) return { error: "La categoría es obligatoria." };

    // Precio diario
    const dailyPrice = Math.round(parseFloat(dailyPriceRaw) * 100);
    if (isNaN(dailyPrice) || dailyPrice < 100)
      return { error: "El precio mínimo es $1.00." };

    // Payload del listing
    const payload: any = {
      title,
      brand: brand || null,
      model: model || null,
      category,
      daily_price: dailyPrice,
      description: description || null,
      updated_at: new Date().toISOString(),
    };

    // Datos de la dirección
    const latitude = latitudeRaw ? parseFloat(latitudeRaw) : null;
    const longitude = longitudeRaw ? parseFloat(longitudeRaw) : null;

    // Actualiza la dirección
    if (
      latitude != null &&
      longitude != null &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    ) {
      // Crea la dirección
      const { data: newAddress, error: addrError } = await supabase
        .from("addresses")
        .insert({
          user_id: user.id,
          line1: city || "Sin dirección",
          city: city || "Sin ciudad",
          state: state || "Sin estado",
          postal_code: "000000",
          country: "EC",
          latitude,
          longitude,
        })
        .select("id")
        .single();
      if (!addrError && newAddress) {
        payload.address_id = newAddress.id;
      }
    }

    // Sube la nueva imagen de portada
    const coverFile = formData.get("coverImage") as File | null;
    if (coverFile && coverFile.size > 0) {
      if (coverFile.size > 5 * 1024 * 1024)
        return { error: "La imagen no puede superar los 5MB." };
      const url = await uploadCoverImage(coverFile, user.id);
      if (url) payload.cover_image_url = url;
    }

    // Sube nuevas imágenes de galería (si se enviaron)
    const galleryFiles = formData.getAll("galleryImages") as File[];
    const validGallery = galleryFiles.filter((f) => f && f.size > 0);
    if (validGallery.length > 0) {
      const galleryUrls = await uploadGalleryImages(validGallery, user.id);
      if (galleryUrls.length > 0) payload.gallery_images = galleryUrls;
    }

    // Obtiene el ID del proveedor
    const providerId = await getMyProviderId();
    if (!providerId) return { error: "No eres proveedor." };

    // Actualiza el listing
    const { error } = await supabase
      .from("listings").update(payload).eq("id", id).eq("provider_id", providerId);
    if (error) return { error: "Error al actualizar el equipo." };

    revalidatePath("/provider/catalog");
    revalidatePath(`/listings/${id}`);
    revalidatePath("/map");
    return { success: true };
  } catch {
    return { error: "Error inesperado." };
  }
}

// Cambia el estado de publicación del listing
export async function togglePublish(id: string, currentState: boolean) {
  // Obtiene el ID del proveedor
  const providerId = await getMyProviderId();
  if (!providerId) return { error: "No autenticado." };

  // Cliente de Supabase
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("listings")
    .update({ is_published: !currentState, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("provider_id", providerId);

  if (error) return { error: "Error al cambiar el estado." };

  // Revalida las rutas
  revalidatePath("/provider/catalog");
  revalidatePath("/listings");
  revalidatePath("/");

  return { success: true };
}

// ─── Disponibilidad ────────────────────────────────────────────────────────────

export type AvailabilityStatus = "available" | "maintenance" | "private_use";

/**
 * Actualiza el estado de disponibilidad de un equipo.
 * Si el estado no es "available", también lo despublica.
 */
export async function updateListingAvailability(
  id: string,
  status: AvailabilityStatus
): Promise<{ error?: string }> {
  const providerId = await getMyProviderId();
  if (!providerId) return { error: "No autenticado." };

  const admin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {
    availability_status: status,
    updated_at: new Date().toISOString(),
  };
  // Despublicar si no está disponible
  if (status !== "available") patch.is_published = false;

  const { error } = await admin
    .from("listings")
    .update(patch)
    .eq("id", id)
    .eq("provider_id", providerId);

  if (error) return { error: "Error al actualizar la disponibilidad." };
  revalidatePath("/provider/inventory");
  revalidatePath("/provider/catalog");
  revalidatePath("/listings");
  return {};
}

// Elimina un listing
export async function deleteListing(id: string) {
  // Obtiene el ID del proveedor
  const providerId = await getMyProviderId();
  if (!providerId) return { error: "No autenticado." };

  // Cliente de Supabase
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("listings")
    .update({ deleted_at: new Date().toISOString(), is_published: false })
    .eq("id", id)
    .eq("provider_id", providerId);

  if (error) return { error: "Error al eliminar." };

  // Revalida las rutas
  revalidatePath("/provider/catalog");
  revalidatePath("/listings");
  revalidatePath("/");
  return { success: true };
}
