import { supabase } from './supabase';

export type NotificationType =
    | 'booking_request'
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'new_message'
    | 'identity_verified'
    | 'identity_rejected'
    | 'review_received';

export type AppNotification = {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    href: string | null;
    metadata: any;
    is_read: boolean;
    created_at: string;
};

export async function getMyNotifications(): Promise<AppNotification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('[notificationsService] getMyNotifications:', error.message);
        return [];
    }

    return data as AppNotification[];
}

export async function getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) {
        console.error('[notificationsService] getUnreadCount:', error.message);
        return 0;
    }

    return count || 0;
}

export async function markAsRead(id: string): Promise<{ error?: string; success?: boolean }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { error: 'No se pudo marcar como leída' };
    return { success: true };
}

export async function markAllAsRead(): Promise<{ error?: string; success?: boolean }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) return { error: 'No se pudieron marcar todas como leídas' };
    return { success: true };
}