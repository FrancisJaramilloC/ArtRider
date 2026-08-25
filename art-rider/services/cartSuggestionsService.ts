"use server";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type CartSuggestion = {
  listingId: string;
  title: string;
  dailyPrice: number;
  coverImageUrl: string | null;
  providerId: string;
  providerName: string;
  reason: string;
  category: string;
};

export async function getCartSuggestions(cartListingIds: string[]): Promise<CartSuggestion[]> {
  if (!cartListingIds.length) return [];
  
  const admin = createSupabaseAdminClient();
  
  // 1. Fetch cart items with their specs and city
  const { data: cartListings } = await admin
    .from("listings")
    .select(`
      id, title, category, specs,
      address:addresses!inner(city)
    `)
    .in("id", cartListingIds);
  
  if (!cartListings?.length) return [];
  
  // 2. Get the city from cart items
  const cityRaw = cartListings[0]?.address as any;
  const city = Array.isArray(cityRaw) ? cityRaw[0]?.city : cityRaw?.city;
  if (!city) return [];
  
  // 3. Analyze what's in the cart to detect gaps
  const hasAudio = cartListings.some(l => l.category === 'sonido' || l.category === 'audio');
  const hasLighting = cartListings.some(l => l.category === 'iluminacion' || l.category === 'lighting');
  
  const specs = cartListings.map(l => l.specs || {});
  const hasSubwoofer = specs.some((s: any) => s.incluye_subwoofer === true);
  const hasDMX = specs.some((s: any) => s.incluye_dmx === true);
  const hasRoboticas = specs.some((s: any) => {
    const tipo = s.tipo_iluminacion || '';
    return tipo.toLowerCase().includes('robótica') || tipo.toLowerCase().includes('robotica') || tipo.toLowerCase().includes('efecto') || tipo.toLowerCase().includes('beam');
  });
  
  // 4. Define gaps
  type Gap = { category: string; reason: string; specFilter?: (s: any) => boolean };
  const gaps: Gap[] = [];
  
  if (hasAudio && !hasSubwoofer) {
    gaps.push({
      category: 'sonido',
      reason: 'Tus cajas no incluyen subwoofer. Agrega graves potentes.',
      specFilter: (s: any) => s.incluye_subwoofer === true
    });
  }
  
  if (hasAudio && !hasLighting) {
    gaps.push({
      category: 'iluminacion',
      reason: 'Complementa tu audio con iluminación para tu evento.'
    });
  }
  
  if (hasLighting && !hasRoboticas) {
    gaps.push({
      category: 'iluminacion',
      reason: 'Dale más show con luces de efectos o robóticas.',
      specFilter: (s: any) => {
        const tipo = (s.tipo_iluminacion || '').toLowerCase();
        return tipo.includes('robótica') || tipo.includes('robotica') || tipo.includes('efecto') || tipo.includes('beam');
      }
    });
  }
  
  if (hasLighting && !hasDMX) {
    gaps.push({
      category: 'iluminacion',
      reason: 'Agrega control DMX para sincronizar tus luces.',
      specFilter: (s: any) => s.incluye_dmx === true
    });
  }
  
  if (!hasAudio) {
    gaps.push({
      category: 'sonido',
      reason: 'Agrega un sistema de sonido para tu evento.'
    });
  }
  
  if (gaps.length === 0) return [];
  
  // 5. Fetch candidate listings from same city, not in cart
  const { data: candidates } = await admin
    .from("listings")
    .select(`
      id, title, category, daily_price, cover_image_url, specs, provider_id,
      provider:providers(brand_name),
      address:addresses!inner(city),
      equipment_units(id, internal_status)
    `)
    .eq("is_published", true)
    .is("deleted_at", null)
    .ilike("addresses.city", `%${city}%`)
    .not("id", "in", `(${cartListingIds.join(',')})`);
  
  if (!candidates?.length) return [];
  
  // 6. Filter candidates that have available units
  const availableCandidates = candidates.filter(c => {
    const units = c.equipment_units || [];
    return units.some((u: any) => u.internal_status === 'AVAILABLE');
  });
  
  // Let's get provider_ids from the cart items
  const { data: cartWithProviders } = await admin
    .from("listings")
    .select("id, provider_id")
    .in("id", cartListingIds);
  const cartProvIds = new Set((cartWithProviders || []).map(l => l.provider_id));
  
  // 7. Match gaps to candidates and pick the best
  const suggestions: CartSuggestion[] = [];
  
  for (const gap of gaps) {
    if (suggestions.length >= 3) break;
    
    // Filter by category
    let matching = availableCandidates.filter(c => {
      const cat = c.category || '';
      if (gap.category === 'sonido') return cat === 'sonido' || cat === 'audio';
      if (gap.category === 'iluminacion') return cat === 'iluminacion' || cat === 'lighting';
      return false;
    });
    
    // Apply spec filter if provided
    if (gap.specFilter) {
      const specFiltered = matching.filter(c => gap.specFilter!((c as any).specs || {}));
      if (specFiltered.length > 0) matching = specFiltered;
    }
    
    // Skip if already suggested this listing
    matching = matching.filter(c => !suggestions.some(s => s.listingId === c.id));
    
    if (matching.length === 0) continue;
    
    // Sort: prioritize same provider, then by price ascending
    matching.sort((a, b) => {
      const aIsSameProvider = cartProvIds.has(a.provider_id) ? 0 : 1;
      const bIsSameProvider = cartProvIds.has(b.provider_id) ? 0 : 1;
      if (aIsSameProvider !== bIsSameProvider) return aIsSameProvider - bIsSameProvider;
      return a.daily_price - b.daily_price;
    });
    
    const best = matching[0];
    const providerRaw = best.provider;
    const provider = Array.isArray(providerRaw) ? providerRaw[0] : providerRaw;
    
    suggestions.push({
      listingId: best.id,
      title: best.title || 'Equipo',
      dailyPrice: best.daily_price,
      coverImageUrl: best.cover_image_url,
      providerId: best.provider_id,
      providerName: provider?.brand_name || 'Proveedor',
      reason: gap.reason,
      category: best.category || gap.category,
    });
  }
  
  return suggestions;
}
