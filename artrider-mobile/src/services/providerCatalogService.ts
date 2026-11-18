import { COPY } from '@/constants/copy';
import { supabase, SUPABASE_URL } from './supabase';
import { serviceError } from '@/utils/errors';
import { getMyProviderProfile } from './providerService';
import { SPEC_SCHEMA_VERSION, type ListingSpecs } from '@/constants/listingSpecs';
import { canonicalBrands, collapseSpaces, normalizeBrand } from '@/utils/listingData';

const BRANDS_CACHE_MS = 5 * 60 * 1000;
let brandsCache: { at: number; brands: string[] } | null = null;

/**
 * Marcas que ya existen en los equipos (distintas sin importar mayúsculas ni espacios, con la escritura más usada).
 * Sirve para autocompletar y para que «Sonic», «SONIC» y «sonic» sean una sola marca. Si falla, devuelve lo último que tenía o [].
 */
export async function getKnownBrands(): Promise<string[]> {
    if (brandsCache && Date.now() - brandsCache.at < BRANDS_CACHE_MS) return brandsCache.brands;
    const { data, error } = await supabase.from('listings').select('brand').is('deleted_at', null).not('brand', 'is', null).limit(2000);
    if (error) {
        console.warn('[providerCatalogService] getKnownBrands:', error.message);
        return brandsCache?.brands ?? [];
    }
    const brands = canonicalBrands((data ?? []).map((row) => row.brand as string | null));
    brandsCache = { at: Date.now(), brands };
    return brands;
}

/** Marca lista para guardar: sin espacios de más, con capitalización consistente y igual a la ya existente si la hay. */
async function resolveBrand(raw: string): Promise<string | null> {
    const known = await getKnownBrands();
    return normalizeBrand(raw, known) || null;
}

/** Sin datos útiles (solo schema_version) no se guarda nada: NULL. Así «tiene specs» significa que de verdad hay datos. */
function specsForSave(specs: ListingSpecs | null | undefined): ListingSpecs | null {
    if (!specs) return null;
    const hasData = Object.keys(specs).some((key) => key !== 'schema_version');
    return hasData ? { ...specs, schema_version: specs.schema_version ?? SPEC_SCHEMA_VERSION } : null;
}

export type CreateListingParams = {
    category: string;
    title: string;
    brand: string;
    model: string;
    description: string;
    dailyPriceDollars: number;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
    coverImageUri: string;
    coverImageMimeType: string;
    quantity: number;
    /** Especificaciones (ver constants/listingSpecs.ts). Opcional: nunca bloquea publicar. */
    specs?: ListingSpecs | null;
};

export type CreateListingResult = { listingId?: string; error?: string };

/**
 * Crea el anuncio completo: dirección → foto → listing → unidades físicas.
 * No es una transacción real de Postgres (son 4 llamadas secuenciales),
 * pero se limpia lo ya creado si un paso posterior falla, para no dejar
 * basura huérfana.
 */
export async function createListing(params: CreateListingParams): Promise<CreateListingResult> {
    try {
        const provider = await getMyProviderProfile();
        if (!provider) return { error: COPY.noActiveProviderProfile };
        if (provider.status !== 'active') return { error: COPY.providerNotActiveYet };

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'No autenticado.' };

        // 1. Dirección
        const { data: address, error: addressError } = await supabase
            .from('addresses')
            .insert({
                user_id: user.id,
                line1: params.addressLine1.trim(),
                city: params.city.trim(),
                state: params.state.trim(),
                postal_code: params.postalCode.trim(),
                country: params.country.trim(),
                latitude: params.latitude,
                longitude: params.longitude,
            })
            .select('id')
            .single();

        if (addressError || !address) {
            console.error('[providerCatalogService] createListing address:', addressError?.message);
            return { error: 'No se pudo guardar la ubicación.' };
        }

        // 2. Foto de portada — se sube vía Edge Function con key de
        // servicio, en vez de directo desde el cliente (ver notas en
        // upload-listing-cover/index.ts sobre por qué).
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            await supabase.from('addresses').delete().eq('id', address.id);
            return { error: 'No autenticado.' };
        }

        const response = await fetch(params.coverImageUri);
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
            await supabase.from('addresses').delete().eq('id', address.id);
            return { error: 'La foto no puede superar los 5MB.' };
        }

        // Convierte el ArrayBuffer a base64 (RN no tiene Buffer nativo)
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const imageBase64 = btoa(binary);

        const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-listing-cover`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ imageBase64, mimeType: params.coverImageMimeType }),
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || uploadData.error) {
            console.error('[providerCatalogService] createListing upload:', uploadData.error);
            await supabase.from('addresses').delete().eq('id', address.id);
            return { error: uploadData.error ?? 'No se pudo subir la foto.' };
        }

        const coverImageUrl = uploadData.url;

        // 3. El anuncio en sí
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .insert({
                provider_id: provider.id,
                title: collapseSpaces(params.title),
                brand: await resolveBrand(params.brand),
                model: collapseSpaces(params.model) || null,
                category: params.category,
                description: params.description.trim() || null,
                specs: specsForSave(params.specs),
                daily_price: Math.round(params.dailyPriceDollars * 100),
                address_id: address.id,
                cover_image_url: coverImageUrl,
                is_published: true,
            })
            .select('id')
            .single();

        if (listingError || !listing) {
            console.error('[providerCatalogService] createListing insert:', listingError?.message);
            await supabase.from('addresses').delete().eq('id', address.id);
            return { error: 'No se pudo crear el anuncio.' };
        }

        // 4. Unidades físicas — número de serie generado automáticamente,
        // el proveedor solo eligió CUÁNTAS tiene.
        const shortId = listing.id.slice(0, 6);
        const units = Array.from({ length: params.quantity }, (_, i) => ({
            listing_id: listing.id,
            serial_number: `${params.category.slice(0, 3).toUpperCase()}-${shortId}-${i + 1}`,
            internal_status: 'AVAILABLE',
        }));

        const { error: unitsError } = await supabase.from('equipment_units').insert(units);
        if (unitsError) {
            console.error('[providerCatalogService] createListing units:', unitsError.message);
            return { error: 'El anuncio se creó pero no se pudieron registrar las unidades. Contáctanos.' };
        }

        return { listingId: listing.id };
    } catch (e: any) {
        console.error('[providerCatalogService] createListing unexpected:', e);
        return { error: 'Ocurrió un error inesperado.' };
    }
}

export type MyListing = {
    id: string;
    title: string | null;
    brand: string | null;
    model: string | null;
    cover_image_url: string | null;
    daily_price: number;
    category: string | null;
    is_published: boolean;
};

/** Tamaño de página al leer el catálogo del Partner (PostgREST corta en 1000 filas por consulta). */
const CATALOG_PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Lee todas las páginas de una consulta de solo lectura; un fallo en cualquier página se propaga. */
async function readAllPages<T>(fetchPage: (from: number, to: number) => PageResult<T>, context: string): Promise<T[]> {
    const all: T[] = [];
    for (let from = 0; ; from += CATALOG_PAGE_SIZE) {
        const { data, error } = await fetchPage(from, from + CATALOG_PAGE_SIZE - 1);
        if (error) throw serviceError(context, error);
        const rows = data ?? [];
        all.push(...rows);
        if (rows.length < CATALOG_PAGE_SIZE) return all;
    }
}

/** Todos los anuncios del proveedor autenticado, publicados o no (para su propia gestión). Paginado: aguanta miles. */
export async function getMyListings(): Promise<MyListing[]> {
    const provider = await getMyProviderProfile();
    if (!provider) return [];

    return readAllPages<MyListing>(
        (from, to) =>
            supabase
                .from('listings')
                .select('id, title, brand, model, cover_image_url, daily_price, category, is_published')
                .eq('provider_id', provider.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .order('id')
                .range(from, to) as unknown as PageResult<MyListing>,
        '[providerCatalogService] getMyListings',
    );
}

export async function toggleListingPublished(listingId: string, isPublished: boolean): Promise<{ error?: string }> {
    const { error } = await supabase.from('listings').update({ is_published: isPublished }).eq('id', listingId);
    if (error) return { error: 'No se pudo actualizar.' };
    return {};
}

/** Soft-delete — nunca se borra de verdad, igual que el resto del sistema. */
export async function deleteListing(listingId: string): Promise<{ error?: string }> {
    const { error } = await supabase.from('listings').update({ deleted_at: new Date().toISOString() }).eq('id', listingId);
    if (error) return { error: 'No se pudo eliminar.' };
    return {};
}
export type EditableListing = {
    id: string;
    category: string;
    title: string;
    brand: string;
    model: string;
    description: string;
    dailyPriceDollars: number;
    coverImageUrl: string | null;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    /** Especificaciones guardadas (incluye claves que la app no conoce: se conservan al guardar). */
    specs: ListingSpecs | null;
};

/** Trae un anuncio propio con todos sus datos, para prellenar el wizard en modo edición. */
export async function getListingForEdit(listingId: string): Promise<EditableListing | null> {
    // Columnas como texto (no literal) para poder pedir o no `specs`; el resultado se lee con un tipo propio.
    const columnsWith = (withSpecs: boolean): string =>
        `id, category, title, brand, model, description, daily_price, cover_image_url, address_id,${withSpecs ? " specs," : ""} address:addresses(line1, city, state, postal_code, country, latitude, longitude)`;
    const fetchRow = async (withSpecs: boolean) => {
        const res = await supabase.from("listings").select(columnsWith(withSpecs)).eq("id", listingId).single();
        return { data: res.data as any, error: res.error };
    };
    let { data, error } = await fetchRow(true);
    // Si la columna specs aún no existiera en la base, se edita igual (sin specs) en vez de romper la pantalla.
    if (error && error.message.includes("specs")) ({ data, error } = await fetchRow(false));

    if (error) throw serviceError('[providerCatalogService] getListingForEdit', error);
    if (!data) return null;

    const address = Array.isArray((data as any).address) ? (data as any).address[0] : (data as any).address;

    return {
        id: data.id,
        category: data.category ?? '',
        title: data.title ?? '',
        brand: data.brand ?? '',
        model: data.model ?? '',
        description: data.description ?? '',
        dailyPriceDollars: data.daily_price / 100,
        coverImageUrl: data.cover_image_url,
        addressLine1: address?.line1 ?? '',
        city: address?.city ?? '',
        state: address?.state ?? '',
        postalCode: address?.postal_code ?? '',
        country: address?.country ?? 'Ecuador',
        latitude: address?.latitude ?? null,
        longitude: address?.longitude ?? null,
        specs: ((data as any).specs as ListingSpecs | null | undefined) ?? null,
    };
}

export type UpdateListingParams = {
    listingId: string;
    category: string;
    title: string;
    brand: string;
    model: string;
    description: string;
    dailyPriceDollars: number;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
    /** URI local si el proveedor eligió una foto nueva; null si dejó la que ya tenía. */
    newCoverImageUri: string | null;
    newCoverImageMimeType: string | null;
    /** Especificaciones ya combinadas con las existentes (ver buildSpecs). undefined = no tocarlas. */
    specs?: ListingSpecs | null;
};

export async function updateListing(params: UpdateListingParams): Promise<{ error?: string }> {
    try {
        const { data: listing, error: fetchError } = await supabase
            .from('listings')
            .select('address_id')
            .eq('id', params.listingId)
            .single();

        if (fetchError || !listing) return { error: 'Anuncio no encontrado.' };

        let coverImageUrl: string | undefined;

        if (params.newCoverImageUri && params.newCoverImageMimeType) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { error: 'No autenticado.' };

            const response = await fetch(params.newCoverImageUri);
            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
                return { error: 'La foto no puede superar los 5MB.' };
            }
            let binary = '';
            const bytes = new Uint8Array(arrayBuffer);
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            const imageBase64 = btoa(binary);

            const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-listing-cover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ imageBase64, mimeType: params.newCoverImageMimeType }),
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || uploadData.error) {
                return { error: uploadData.error ?? 'No se pudo subir la foto.' };
            }
            coverImageUrl = uploadData.url;
        }

        const { error: addressError } = await supabase
            .from('addresses')
            .update({
                line1: params.addressLine1.trim(),
                city: params.city.trim(),
                state: params.state.trim(),
                postal_code: params.postalCode.trim(),
                country: params.country.trim(),
                latitude: params.latitude,
                longitude: params.longitude,
            })
            .eq('id', listing.address_id);

        if (addressError) return { error: 'No se pudo actualizar la ubicación.' };

        const updatePayload: Record<string, any> = {
            title: collapseSpaces(params.title),
            brand: await resolveBrand(params.brand),
            model: collapseSpaces(params.model) || null,
            category: params.category,
            description: params.description.trim() || null,
            daily_price: Math.round(params.dailyPriceDollars * 100),
        };
        if (params.specs !== undefined) updatePayload.specs = specsForSave(params.specs);
        if (coverImageUrl) updatePayload.cover_image_url = coverImageUrl;

        const { error: listingError } = await supabase
            .from('listings')
            .update(updatePayload)
            .eq('id', params.listingId);

        if (listingError) return { error: 'No se pudo actualizar el anuncio.' };

        return {};
    } catch (e: any) {
        console.error('[providerCatalogService] updateListing unexpected:', e);
        return { error: 'Ocurrió un error inesperado.' };
    }
}
export type CreatePackageParams = {
    title: string;
    description: string;
    capacityPeople: number;
    dailyPriceDollars: number;
    coverImageUri: string;
    coverImageMimeType: string;
    items: { listingId: string; quantity: number }[];
};

export async function createPackage(params: CreatePackageParams): Promise<{ packageId?: string; error?: string }> {
    try {
        const provider = await getMyProviderProfile();
        if (!provider) return { error: COPY.noActiveProviderProfile };
        if (provider.status !== 'active') return { error: COPY.providerNotActiveYet };
        if (params.items.length === 0) return { error: 'Selecciona al menos un equipo para el paquete.' };

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { error: 'No autenticado.' };

        const response = await fetch(params.coverImageUri);
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
            return { error: 'La foto no puede superar los 5MB.' };
        }
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const imageBase64 = btoa(binary);

        const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-listing-cover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ imageBase64, mimeType: params.coverImageMimeType }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || uploadData.error) {
            return { error: uploadData.error ?? 'No se pudo subir la foto.' };
        }

        const { data: pkg, error: pkgError } = await supabase
            .from('packages')
            .insert({
                provider_id: provider.id,
                title: params.title.trim(),
                description: params.description.trim() || null,
                daily_price: Math.round(params.dailyPriceDollars * 100),
                capacity_people: params.capacityPeople,
                cover_image_url: uploadData.url,
                is_published: true,
            })
            .select('id')
            .single();

        if (pkgError || !pkg) {
            console.error('[providerCatalogService] createPackage insert:', pkgError?.message);
            return { error: 'No se pudo crear el paquete.' };
        }

        const itemRows = params.items.map((item) => ({
            package_id: pkg.id,
            listing_id: item.listingId,
            quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase.from('package_items').insert(itemRows);
        if (itemsError) {
            console.error('[providerCatalogService] createPackage items:', itemsError.message);
            return { error: 'El paquete se creó pero no se pudieron agregar los equipos. Contáctanos.' };
        }

        return { packageId: pkg.id };
    } catch (e: any) {
        console.error('[providerCatalogService] createPackage unexpected:', e);
        return { error: 'Ocurrió un error inesperado.' };
    }
}

export type MyPackage = {
    id: string;
    title: string | null;
    cover_image_url: string | null;
    daily_price: number;
    is_published: boolean;
};

export async function getMyPackages(): Promise<MyPackage[]> {
    const provider = await getMyProviderProfile();
    if (!provider) return [];

    return readAllPages<MyPackage>(
        (from, to) =>
            supabase
                .from('packages')
                .select('id, title, cover_image_url, daily_price, is_published')
                .eq('provider_id', provider.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .order('id')
                .range(from, to) as unknown as PageResult<MyPackage>,
        '[providerCatalogService] getMyPackages',
    );
}

export async function togglePackagePublished(packageId: string, isPublished: boolean): Promise<{ error?: string }> {
    const { error } = await supabase.from('packages').update({ is_published: isPublished }).eq('id', packageId);
    if (error) return { error: 'No se pudo actualizar.' };
    return {};
}

export async function deletePackage(packageId: string): Promise<{ error?: string }> {
    const { error } = await supabase.from('packages').update({ deleted_at: new Date().toISOString() }).eq('id', packageId);
    if (error) return { error: 'No se pudo eliminar.' };
    return {};
}
export type EditablePackage = {
    id: string;
    title: string;
    description: string;
    capacityPeople: number;
    dailyPriceDollars: number;
    coverImageUrl: string | null;
    items: { listingId: string; quantity: number }[];
};

export async function getPackageForEdit(packageId: string): Promise<EditablePackage | null> {
    const { data, error } = await supabase
        .from('packages')
        .select(`
            id, title, description, capacity_people, daily_price, cover_image_url,
            items:package_items(listing_id, quantity)
        `)
        .eq('id', packageId)
        .single();

    if (error) throw serviceError('[providerCatalogService] getPackageForEdit', error);
    if (!data) return null;

    return {
        id: data.id,
        title: data.title ?? '',
        description: data.description ?? '',
        capacityPeople: data.capacity_people ?? 1,
        dailyPriceDollars: data.daily_price / 100,
        coverImageUrl: data.cover_image_url,
        items: ((data as any).items ?? []).map((i: any) => ({ listingId: i.listing_id, quantity: i.quantity })),
    };
}

export type UpdatePackageParams = {
    packageId: string;
    title: string;
    description: string;
    capacityPeople: number;
    dailyPriceDollars: number;
    newCoverImageUri: string | null;
    newCoverImageMimeType: string | null;
    items: { listingId: string; quantity: number }[];
};

export async function updatePackage(params: UpdatePackageParams): Promise<{ error?: string }> {
    try {
        if (params.items.length === 0) return { error: 'Selecciona al menos un equipo para el paquete.' };

        let coverImageUrl: string | undefined;

        if (params.newCoverImageUri && params.newCoverImageMimeType) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { error: 'No autenticado.' };

            const response = await fetch(params.newCoverImageUri);
            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
                return { error: 'La foto no puede superar los 5MB.' };
            }
            let binary = '';
            const bytes = new Uint8Array(arrayBuffer);
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            const imageBase64 = btoa(binary);

            const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-listing-cover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ imageBase64, mimeType: params.newCoverImageMimeType }),
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || uploadData.error) {
                return { error: uploadData.error ?? 'No se pudo subir la foto.' };
            }
            coverImageUrl = uploadData.url;
        }

        const updatePayload: Record<string, any> = {
            title: params.title.trim(),
            description: params.description.trim() || null,
            capacity_people: params.capacityPeople,
            daily_price: Math.round(params.dailyPriceDollars * 100),
        };
        if (coverImageUrl) updatePayload.cover_image_url = coverImageUrl;

        const { error: pkgError } = await supabase.from('packages').update(updatePayload).eq('id', params.packageId);
        if (pkgError) return { error: 'No se pudo actualizar el paquete.' };

        // Reconciliar items: se borran todos y se insertan de nuevo — más
        // simple y seguro que calcular un diff fila por fila.
        const { error: deleteError } = await supabase.from('package_items').delete().eq('package_id', params.packageId);
        if (deleteError) return { error: 'No se pudieron actualizar los equipos del paquete.' };

        const itemRows = params.items.map((item) => ({
            package_id: params.packageId,
            listing_id: item.listingId,
            quantity: item.quantity,
        }));
        const { error: insertError } = await supabase.from('package_items').insert(itemRows);
        if (insertError) return { error: 'No se pudieron actualizar los equipos del paquete.' };

        return {};
    } catch (e: any) {
        console.error('[providerCatalogService] updatePackage unexpected:', e);
        return { error: 'Ocurrió un error inesperado.' };
    }
}