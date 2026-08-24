import { getListings, getListingRatings } from './catalogService';
import { getPublishedPackages } from './packagesService';

export type HomeCardItem = {
    id: string;
    title: string;
    category: string | null;
    cover_image_url: string | null;
    daily_price: number;
    city: string;
    rating: number;
    href: string;
    tipo: 'equipo' | 'paquete';
};

export type CityGroup = {
    city: string;
    items: HomeCardItem[];
};

export type HomeData = {
    cityGroups: CityGroup[];
    packages: HomeCardItem[];
};

export async function getHomeData(): Promise<HomeData> {
    const listings = await getListings();
    const ratings = await getListingRatings(listings.map((l) => l.id));

    // Agrupar por ciudad — igual que la web, dinámico según lo que exista
    const cityMap = new Map<string, HomeCardItem[]>();
    for (const listing of listings) {
        const city = listing.address?.city?.trim();
        if (!city) continue;
        if (!cityMap.has(city)) cityMap.set(city, []);
        cityMap.get(city)!.push({
            id: listing.id,
            title: listing.title ?? 'Equipo sin título',
            category: listing.category,
            cover_image_url: listing.cover_image_url,
            daily_price: listing.daily_price,
            city,
            rating: ratings[listing.id] ?? 0,
            href: `/listing/${listing.id}`,
            tipo: 'equipo',
        });
    }

    // Ordenado por cantidad de equipos, ciudades con al menos 1
    const cityGroups: CityGroup[] = Array.from(cityMap.entries())
        .filter(([, items]) => items.length >= 1)
        .sort(([, a], [, b]) => b.length - a.length)
        .map(([city, items]) => ({ city, items }));

    const rawPackages = await getPublishedPackages();
    const packages: HomeCardItem[] = rawPackages.map((pkg) => ({
        id: pkg.id,
        title: pkg.title,
        category: null,
        cover_image_url: pkg.cover_image_url,
        daily_price: pkg.daily_price,
        city: 'Ecuador',
        rating: 0,
        href: `/package/${pkg.id}`,
        tipo: 'paquete',
    }));

    return { cityGroups, packages };
}