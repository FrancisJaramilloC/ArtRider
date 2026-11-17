import type { ItemCardData } from '@/components/ui/ItemCard';
import { getUserFavIds } from '@/services/favoritosService';
import { getListingRatings, getListings } from '@/services/catalogService';
import { cityLabel } from '@/utils/city';

export type RelatedListings = { fromProvider: ItemCardData[]; similar: ItemCardData[]; favoriteIds: Set<string> };

const MAX_PER_ROW = 8;

/**
 * «Más de este proveedor» y «Equipos similares» (misma categoría), calculados con los equipos
 * publicados que ya expone `getListings` (sin consultas nuevas).
 */
export async function loadRelatedListings(providerId: string, excludeId: string | null, category: string | null): Promise<RelatedListings> {
  const all = (await getListings()).filter((l) => l.id !== excludeId);
  const fromProvider = all.filter((l) => l.provider_id === providerId).slice(0, MAX_PER_ROW);
  const similar = category ? all.filter((l) => l.provider_id !== providerId && l.category === category).slice(0, MAX_PER_ROW) : [];

  const ids = [...fromProvider, ...similar].map((l) => l.id);
  const [ratings, favs] = await Promise.all([
    ids.length > 0 ? getListingRatings(ids).catch(() => ({}) as Record<string, number>) : Promise.resolve({} as Record<string, number>),
    getUserFavIds(),
  ]);

  const toCard = (l: (typeof all)[number]): ItemCardData => ({
    id: l.id,
    title: l.title ?? 'Equipo sin título',
    category: l.category,
    cover_image_url: l.cover_image_url,
    daily_price: l.daily_price,
    city: l.address?.city ? cityLabel(l.address.city) : null,
    rating: ratings[l.id] ?? 0,
    href: `/listing/${l.id}`,
    tipo: 'equipo',
  });
  return { fromProvider: fromProvider.map(toCard), similar: similar.map(toCard), favoriteIds: new Set(favs.equipoIds) };
}
