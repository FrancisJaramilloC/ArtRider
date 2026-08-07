import { supabase } from './supabase';

export type Listing = {
    id: string;
    provider_id: string;
    title: string | null;
    brand: string | null;
    model: string | null;
    category: string | null;
    cover_image_url: string | null;
    daily_price: number;
    description: string | null;
    is_published: boolean;
    created_at: string;
    address_id?: string | null;
    address?: {
        latitude: number;
        longitude: number;
        city: string;
        state: string;
    } | null;
};

export type ListingWithProvider = Listing & {
    provider?: {
        brand_name: string | null;
        created_at: string;
        user_id: string;
    } | null;
};

export type CatalogItem = {
    id: string;
    item_type: 'listing' | 'package';
    provider_id: string;
    title: string | null;
    category: string | null;
    cover_image_url: string | null;
    daily_price: number;
    description: string | null;
    is_published: boolean;
    created_at: string;
};

export type CatalogFilters = {
    query?: string;
    type?: 'listing' | 'package';
    category?: string;
    minPrice?: number;
    maxPrice?: number;
};

const LISTING_SELECT =
    'id, provider_id, title, brand, model, category, cover_image_url, daily_price, description, is_published, created_at, address_id, address:addresses(latitude, longitude, city, state)';

const LISTING_DETAIL_SELECT =
    'id, provider_id, title, brand, model, category, cover_image_url, daily_price, description, is_published, created_at, address_id, address:addresses(latitude, longitude, city, state), provider:providers(brand_name, created_at, user_id)';

// Supabase puede devolver el JOIN como array en vez de objeto — normalizamos.
function normalizeListingAddress(raw: any): Listing {
    const address = Array.isArray(raw.address) ? (raw.address[0] ?? null) : (raw.address ?? null);
    return { ...raw, address };
}

/** Todos los listings publicados y no eliminados. */
export async function getListings(): Promise<Listing[]> {
    const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`[catalogService] getListings: ${error.message}`);
    return (data ?? []).map(normalizeListingAddress);
}

/** Un listing por ID, sin datos de proveedor. */
export async function getListingById(id: string): Promise<Listing | null> {
    const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', id)
        .eq('is_published', true)
        .is('deleted_at', null)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`[catalogService] getListingById: ${error.message}`);
    }
    return normalizeListingAddress(data);
}

/** Un listing con datos del proveedor — usado en pantalla de detalle. */
export async function getListingByIdWithProvider(id: string): Promise<ListingWithProvider | null> {
    const { data, error } = await supabase
        .from('listings')
        .select(LISTING_DETAIL_SELECT)
        .eq('id', id)
        .eq('is_published', true)
        .is('deleted_at', null)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`[catalogService] getListingByIdWithProvider: ${error.message}`);
    }

    const normalized = normalizeListingAddress(data);
    const provider = Array.isArray((data as any).provider)
        ? ((data as any).provider[0] ?? null)
        : ((data as any).provider ?? null);
    return { ...normalized, provider };
}

/** Catálogo unificado (listings + packages) desde la vista catalog_items. */
export async function getCatalogItems(): Promise<CatalogItem[]> {
    const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`[catalogService] getCatalogItems: ${error.message}`);
    return (data ?? []) as CatalogItem[];
}

/** Búsqueda en el catálogo unificado con filtros opcionales. */
export async function searchCatalog(filters: CatalogFilters = {}): Promise<CatalogItem[]> {
    let query = supabase.from('catalog_items').select('*').eq('is_published', true);

    if (filters.type) query = query.eq('item_type', filters.type);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.minPrice !== undefined) query = query.gte('daily_price', filters.minPrice);
    if (filters.maxPrice !== undefined) query = query.lte('daily_price', filters.maxPrice);
    if (filters.query) query = query.ilike('title', `%${filters.query}%`);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`[catalogService] searchCatalog: ${error.message}`);
    return (data ?? []) as CatalogItem[];
}