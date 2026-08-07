import { supabase } from './supabase';

export type Package = {
    id: string;
    provider_id: string;
    title: string;
    description: string | null;
    daily_price: number;
    is_published: boolean;
    cover_image_url: string | null;
    created_at: string;
};

export type PackageItem = {
    id: string;
    package_id: string;
    listing_id: string;
    quantity: number;
};

export type PackageWithItems = Package & {
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

function normalizePackageData(raw: any): PackageWithItems {
    const provider = Array.isArray(raw.provider) ? (raw.provider[0] ?? null) : (raw.provider ?? null);

    const items = (raw.items ?? []).map((item: any) => {
        if (!item.listing) return item;
        const rawListing = item.listing;
        const address = Array.isArray(rawListing.address) ? (rawListing.address[0] ?? null) : (rawListing.address ?? null);
        return { ...item, listing: { ...rawListing, address } };
    });

    return { ...raw, provider, items } as PackageWithItems;
}

/** Detalle público de un paquete, con sus equipos y proveedor. */
export async function getPackageById(id: string): Promise<PackageWithItems | null> {
    const { data, error } = await supabase
        .from('packages')
        .select(`
      *,
      items:package_items(
        *,
        listing:listings(id, title, brand, model, category, cover_image_url, daily_price, address_id, address:addresses(latitude, longitude, city, state))
      ),
      provider:providers(brand_name, created_at)
    `)
        .eq('id', id)
        .eq('is_published', true)
        .is('deleted_at', null)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`[packagesService] getPackageById: ${error.message}`);
    }

    return normalizePackageData(data);
}