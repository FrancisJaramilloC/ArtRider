import { supabase } from './supabase';

export type ConversationSummary = {
    id: string;
    listing_id: string | null;
    booking_id: string | null;
    client_id: string | null;
    provider_id: string | null;
    created_at: string;
    other_name: string;
    equipment_title: string | null;
    cover_image_url: string | null;
    last_message_text: string | null;
    last_message_time: string | null;
    last_message_is_mine: boolean;
    unread_count: number;
    booking_start_date: string | null;
    booking_end_date: string | null;
    booking_total: number | null;
};

export type Message = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    read: boolean;
    sent_at: string;
};

/**
 * Lista las conversaciones del usuario autenticado, ya enriquecidas
 * (nombre de la otra persona, último mensaje, no leídos, etc.).
 * Todo resuelto en una sola llamada vía función de Postgres — evita
 * el N+1 de hacer un JOIN por conversación desde el cliente.
 */
export async function getConversations(): Promise<ConversationSummary[]> {
    const { data, error } = await supabase.rpc('get_my_conversations');

    if (error) {
        console.error('[messagesService] getConversations:', error.message);
        return [];
    }

    return (data ?? []) as ConversationSummary[];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, read, sent_at')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

    if (error) {
        console.error('[messagesService] getMessages:', error.message);
        return [];
    }

    return (data ?? []) as Message[];
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            content,
            sender_id: user.id,
            read: false,
            sent_at: new Date().toISOString(),
        })
        .select('id, conversation_id, sender_id, content, read, sent_at')
        .single();

    if (error) throw error;
    return data as Message;
}

/** Marca como leídos los mensajes que no son míos, vía RPC (UPDATE directo está bloqueado por RLS). */
export async function markMessagesRead(conversationId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
    });

    if (error) {
        console.error('[messagesService] markMessagesRead:', error.message);
    }
}