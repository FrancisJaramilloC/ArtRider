import { supabase } from './supabase';

export type FavoritoTipo = 'equipo' | 'paquete';

export async function getUserFavIds(): Promise<{ equipoIds: string[]; paqueteIds: string[] }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { equipoIds: [], paqueteIds: [] };

        const { data } = await supabase
            .from('favorites')
            .select('item_id, tipo')
            .eq('usuario_id', user.id);

        const rows = data ?? [];
        return {
            equipoIds: rows.filter((r) => r.tipo === 'equipo').map((r) => r.item_id),
            paqueteIds: rows.filter((r) => r.tipo === 'paquete').map((r) => r.item_id),
        };
    } catch {
        return { equipoIds: [], paqueteIds: [] };
    }
}

/**
 * Patrón delete-first: intenta borrar primero (evita un SELECT que RLS
 * podría bloquear y reporta errores reales en vez de silenciarlos).
 * Si no borró nada, entonces no existía → lo crea.
 */
export async function toggleFavorito(
    itemId: string,
    tipo: FavoritoTipo
): Promise<{ esFavorito: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { esFavorito: false, error: 'not_authenticated' };

        const { count: deleted, error: delErr } = await supabase
            .from('favorites')
            .delete({ count: 'exact' })
            .eq('usuario_id', user.id)
            .eq('item_id', itemId)
            .eq('tipo', tipo);

        if (delErr) throw delErr;

        if (deleted && deleted > 0) {
            return { esFavorito: false };
        }

        const { error: insErr } = await supabase
            .from('favorites')
            .insert({ usuario_id: user.id, item_id: itemId, tipo });

        if (insErr) throw insErr;
        return { esFavorito: true };
    } catch (e: any) {
        console.error('[favoritosService] toggleFavorito:', e.message);
        return { esFavorito: false, error: e.message };
    }
}

export async function getFavoritosEquipos() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: favRows } = await supabase
            .from('favorites')
            .select('item_id')
            .eq('usuario_id', user.id)
            .eq('tipo', 'equipo');

        if (!favRows?.length) return [];
        const ids = favRows.map((r) => r.item_id);

        // No necesita cliente admin: listings publicados ya son de lectura
        // pública (confirmado en el item 005), así que el anon/auth key alcanza.
        const { data: listings } = await supabase
            .from('listings')
            .select('id, title, category, cover_image_url, daily_price, address:addresses(city)')
            .in('id', ids)
            .eq('is_published', true)
            .is('deleted_at', null);

        return (listings ?? []).map((l: any) => {
            const addr = Array.isArray(l.address) ? l.address[0] : l.address;
            return { ...l, city: addr?.city ?? 'Ecuador' };
        });
    } catch {
        return [];
    }
}

export async function getFavoritosPaquetes() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: favRows } = await supabase
            .from('favorites')
            .select('item_id')
            .eq('usuario_id', user.id)
            .eq('tipo', 'paquete');

        if (!favRows?.length) return [];
        const ids = favRows.map((r) => r.item_id);

        const { data: packages } = await supabase
            .from('packages')
            .select('id, title, cover_image_url, daily_price')
            .in('id', ids)
            .eq('is_published', true)
            .is('deleted_at', null);

        return (packages ?? []).map((p: any) => ({
            ...p,
            category: 'paquete',
            city: 'Ecuador',
        }));
    } catch {
        return [];
    }
}