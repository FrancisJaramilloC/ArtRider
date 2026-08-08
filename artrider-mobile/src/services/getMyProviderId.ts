import { supabase } from './supabase';

/**
 * Resuelve el providers.id del usuario autenticado actual.
 * Necesario porque listings/bookings/packages referencian providers(id),
 * no directamente el auth.uid() del usuario.
 */
export async function getMyProviderId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (error || !data) return null;
    return data.id;
}