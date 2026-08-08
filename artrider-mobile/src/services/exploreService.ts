import { getListings } from './catalogService';
import { getPublishedPackages } from './packagesService';

export type ExploreItem = {
    id: string;
    title: string;
    category: string | null;
    city: string | null;
    daily_price: number;
    cover_image_url: string | null;
    tipo: 'equipo' | 'paquete';
    href: string;
};

/**
 * Combina listings publicados y paquetes publicados en un solo array para
 * la pantalla de exploración. Los paquetes no tienen ciudad propia (su
 * ubicación depende de los equipos que contienen), así que quedan fuera
 * del filtro de ciudad pero sí participan en texto/precio.
 */
export async function getExploreItems(): Promise<ExploreItem[]> {
    const [listings, packages] = await Promise.all([getListings(), getPublishedPackages()]);

    const equipos: ExploreItem[] = listings.map((l) => ({
        id: l.id,
        title: l.title ?? 'Equipo sin título',
        category: l.category,
        city: l.address?.city?.trim() ?? null,
        daily_price: l.daily_price,
        cover_image_url: l.cover_image_url,
        tipo: 'equipo',
        href: `/listing/${l.id}`,
    }));

    const paquetes: ExploreItem[] = packages.map((p) => ({
        id: p.id,
        title: p.title,
        category: null,
        city: null,
        daily_price: p.daily_price,
        cover_image_url: p.cover_image_url,
        tipo: 'paquete',
        href: `/package/${p.id}`,
    }));

    return [...equipos, ...paquetes];
}