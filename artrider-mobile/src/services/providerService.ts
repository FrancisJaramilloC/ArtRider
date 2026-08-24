import { supabase } from './supabase';

export type ProviderProfile = {
    id: string;
    user_id: string;
    brand_name: string;
    bio: string | null;
    status: 'pending' | 'active' | 'suspended';
    created_at: string;
};

/**
 * Retorna el perfil del proveedor para el usuario autenticado.
 * Retorna null si el usuario no está registrado como proveedor.
 */
export async function getMyProviderProfile(): Promise<ProviderProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // no es proveedor todavía
        throw new Error(`[providerService] getMyProviderProfile failed: ${error.message}`);
    }

    return data as ProviderProfile;
}

export interface BecomeProviderParams {
    brandName: string;
    bio?: string;
}

export interface BecomeProviderResult {
    error?: string;
    success?: boolean;
}

/**
 * Registra al usuario autenticado como proveedor.
 * Estado inicial 'pending' — requiere aprobación manual antes de publicar equipos.
 */
export async function becomeProvider(params: BecomeProviderParams): Promise<BecomeProviderResult> {
    const { brandName, bio = '' } = params;

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { error: 'Debes iniciar sesión para registrarte como proveedor.' };
        }

        const trimmedName = brandName.trim();
        if (!trimmedName) {
            return { error: 'El nombre de tu negocio es obligatorio.' };
        }
        if (trimmedName.length < 2 || trimmedName.length > 80) {
            return { error: 'El nombre del negocio debe tener entre 2 y 80 caracteres.' };
        }
        if (bio && bio.length > 500) {
            return { error: 'La descripción no puede superar los 500 caracteres.' };
        }

        const { data: existing } = await supabase
            .from('providers')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (existing) {
            return { error: 'Ya tienes un perfil de proveedor registrado.' };
        }

        const { error: insertError } = await supabase.from('providers').insert({
            user_id: user.id,
            brand_name: trimmedName,
            bio: bio || null,
            status: 'pending',
        });

        if (insertError) {
            console.error('[providerService] becomeProvider insert error:', insertError);
            return { error: 'No se pudo registrar tu perfil. Por favor intenta más tarde.' };
        }

        return { success: true };
    } catch (error: any) {
        console.error('[providerService] becomeProvider unexpected error:', error);
        return { error: 'Ocurrió un error inesperado. Por favor intenta más tarde.' };
    }
}

export interface UpdateBrandNameResult {
    success: boolean;
    error?: string;
}

export async function updateProviderBrandName(newBrandName: string): Promise<UpdateBrandNameResult> {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: 'No autenticado.' };
        }

        const trimmed = newBrandName.trim();
        if (!trimmed || trimmed.length < 2 || trimmed.length > 80) {
            return { success: false, error: 'El nombre debe tener entre 2 y 80 caracteres.' };
        }

        const { error } = await supabase
            .from('providers')
            .update({ brand_name: trimmed })
            .eq('user_id', user.id);

        if (error) {
            return { success: false, error: 'No se pudo actualizar el nombre.' };
        }

        return { success: true };
    } catch {
        return { success: false, error: 'Error inesperado.' };
    }
}
export type ProviderBooking = {
    booking_id: string;
    status: 'AWAITING_SIGNATURES' | 'PAID' | 'ACTIVE' | 'COMPLETED' | 'DISPUTE' | 'CANCELLED' | 'ARCHIVED';
    start_date: string;
    end_date: string;
    total_price: number;
    created_at: string;
    listing_title: string | null;
    listing_cover_image_url: string | null;
    client_name: string | null;
    client_phone: string | null;
    order_id: string | null;
    already_reviewed: boolean;
    listing_id: string | null;
};

/** Reservas recibidas por el proveedor autenticado. */
export async function getProviderBookings(): Promise<ProviderBooking[]> {
    const { data, error } = await supabase.rpc('get_provider_bookings');
    if (error) {
        console.error('[providerService] getProviderBookings:', error.message);
        return [];
    }
    return (data ?? []) as ProviderBooking[];
}

/** Acepta o rechaza una reserva pendiente — rechazar reembolsa automáticamente si hubo cobro. */
export async function respondToBooking(
    bookingId: string,
    action: 'accept' | 'reject'
): Promise<{ error?: string; refunded?: boolean }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'No autenticado' };

    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/provider-respond-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bookingId, action }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
        return { error: data.error ?? 'No se pudo procesar la solicitud' };
    }
    return { refunded: data.refunded };
}
/** Marca la reserva como terminada y opcionalmente califica al cliente en el mismo paso. */
export async function finalizeBooking(
    bookingId: string,
    rating?: number,
    comment?: string
): Promise<{ error?: string }> {
    const { error } = await supabase.rpc('provider_finalize_booking', {
        p_booking_id: bookingId,
        p_rating: rating ?? null,
        p_comment: comment || null,
    });

    if (error) {
        console.error('[providerService] finalizeBooking:', error.message);
        return { error: 'No se pudo finalizar la reserva.' };
    }
    return {};
}
export type CalendarMark = { date: string; mark: 'booked' | 'blocked' };

/** Marcas del calendario (reservado/bloqueado) para un equipo específico. */
export async function getListingCalendar(listingId: string): Promise<CalendarMark[]> {
    const { data, error } = await supabase.rpc('get_provider_listing_calendar', {
        p_listing_id: listingId,
    });
    if (error) {
        console.error('[providerService] getListingCalendar:', error.message);
        return [];
    }
    return (data ?? []).map((row: any) => ({ date: row.cal_date, mark: row.mark }));
}

/** Bloquea/desbloquea un solo día para un equipo. Devuelve el nuevo estado. */
export async function toggleBlockDate(listingId: string, date: string): Promise<{ mark?: 'available' | 'blocked'; error?: string }> {
    const { data, error } = await supabase.rpc('provider_toggle_block_date', {
        p_listing_id: listingId,
        p_date: date,
    });
    if (error) {
        console.error('[providerService] toggleBlockDate:', error.message);
        if (error.message.includes('ya tiene una reserva')) {
            return { error: 'No puedes bloquear una fecha que ya tiene una reserva.' };
        }
        return { error: 'No se pudo actualizar el calendario.' };
    }
    return { mark: data as 'available' | 'blocked' };
}