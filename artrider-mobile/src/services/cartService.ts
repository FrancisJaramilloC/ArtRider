import { supabase, SUPABASE_URL } from './supabase';
import { serviceError } from '@/utils/errors';
import { chargeWithKushki, type ChargeQuote } from './chargeService';

export type CartItem = {
    id: string;
    item_type: 'listing' | 'package';
    listing_id: string | null;
    package_id: string | null;
    start_date: string;
    end_date: string;
    quantity: number;
    added_at: string;
    // Datos resueltos del listing/paquete, para no hacer N+1 en la pantalla
    title: string | null;
    cover_image_url: string | null;
    daily_price: number | null;
};

/** Carrito del usuario, con título/foto/precio ya resueltos del listing o paquete. */
export async function getCartItems(): Promise<CartItem[]> {
    const { data, error } = await supabase
        .from('cart_items')
        .select(`
      id, item_type, listing_id, package_id, start_date, end_date, quantity, added_at,
      listing:listings(title, cover_image_url, daily_price),
      package:packages(title, cover_image_url, daily_price)
    `)
        .order('added_at', { ascending: false });

    if (error) {
        throw serviceError('[cartService] getCartItems', error);
    }

    return (data ?? []).map((row: any) => {
        const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
        const pkg = Array.isArray(row.package) ? row.package[0] : row.package;
        const source = row.item_type === 'listing' ? listing : pkg;
        return {
            id: row.id,
            item_type: row.item_type,
            listing_id: row.listing_id,
            package_id: row.package_id,
            start_date: row.start_date,
            end_date: row.end_date,
            quantity: row.quantity,
            added_at: row.added_at,
            title: source?.title ?? null,
            cover_image_url: source?.cover_image_url ?? null,
            daily_price: source?.daily_price ?? null,
        };
    });
}

/** Solo el conteo — para el badge del ícono del carrito, sin traer todos los datos. */
export async function getCartCount(): Promise<number> {
    const { count, error } = await supabase
        .from('cart_items')
        .select('id', { count: 'exact', head: true });

    if (error) return 0;
    return count ?? 0;
}

export async function addToCart(params: {
    itemType: 'listing' | 'package';
    listingId?: string;
    packageId?: string;
    startDate: string;
    endDate: string;
    quantity?: number;
}): Promise<{ error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase.from('cart_items').insert({
        client_id: user.id,
        item_type: params.itemType,
        listing_id: params.itemType === 'listing' ? params.listingId : null,
        package_id: params.itemType === 'package' ? params.packageId : null,
        start_date: params.startDate,
        end_date: params.endDate,
        quantity: params.quantity ?? 1,
    });

    if (error) {
        console.error('[cartService] addToCart:', error.message);
        return { error: 'No se pudo agregar al carrito' };
    }
    return {};
}

export async function removeFromCart(cartItemId: string): Promise<void> {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
    if (error) console.error('[cartService] removeFromCart:', error.message);
}

export type CreateCartOrderResult = {
    orderId?: string;
    total?: number;
    error?: string;
};

/** Checkout atómico de todo el carrito — ver create_cart_order() en Postgres. */
export async function createCartOrder(kushkiTicket?: string): Promise<CreateCartOrderResult> {
    const { data, error } = await supabase.rpc('create_cart_order', {
        p_kushki_ticket: kushkiTicket ?? null,
    });

    if (error) {
        console.error('[cartService] createCartOrder:', error.message);
        if (error.message.includes('carrito está vacío')) {
            return { error: 'Tu carrito está vacío.' };
        }
        if (error.message.includes('No hay') || error.message.includes('stock')) {
            return { error: 'Uno de los items de tu carrito ya no tiene disponibilidad para esas fechas.' };
        }
        return { error: 'No se pudo completar la compra. Intenta de nuevo.' };
    }

    const row = data?.[0];
    if (!row) return { error: 'No se pudo completar la compra.' };

    return { orderId: row.order_id, total: row.total };
}
/** Cobra en Kushki y crea todas las reservas del carrito de forma atómica. El total oficial lo calcula el servidor. */
export async function chargeAndCreateCartOrder(
    kushkiToken: string,
    /** Total (centavos) que el Rider tiene en pantalla: el servidor lo compara con el oficial. */
    expectedTotal: number,
): Promise<{ orderId?: string; total?: number; error?: string; code?: string; quote?: ChargeQuote }> {
    const result = await chargeWithKushki(kushkiToken, { kind: 'cart' }, expectedTotal);
    if (result.error) return { error: result.error, code: result.code, quote: result.quote };
    return { orderId: result.orderId, total: result.total };
}
