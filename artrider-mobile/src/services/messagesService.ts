import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ConversationSummary = {
    id: string;
    listing_id: string | null;
    package_id: string | null;
    booking_id: string | null;
    client_id: string | null;
    provider_id: string | null;
    created_at: string;
    other_name: string;
    equipment_title: string | null;
    cover_image_url: string | null;
    listing_city: string | null;
    last_message_text: string | null;
    last_message_time: string | null;
    last_message_is_mine: boolean;
    unread_count: number;
    booking_start_date: string | null;
    booking_end_date: string | null;
    booking_total: number | null;
    is_archived: boolean;
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

/**
 * Se suscribe a mensajes nuevos/actualizados de una conversación específica.
 * Devuelve el canal — quien llama debe hacer supabase.removeChannel(canal)
 * al desmontar la pantalla.
 */
export function subscribeToMessages(
  conversationId: string,
  onInsert: (message: Message) => void,
  onUpdate: (message: Message) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onUpdate(payload.new as Message)
    )
    .subscribe();
}

/** Canal de "escribiendo..." — no toca la base de datos, solo mensajes efímeros entre clientes conectados. */
export function subscribeToTyping(
  conversationId: string,
  myUserId: string,
  onTypingChange: (isTyping: boolean) => void
): RealtimeChannel {
  const channel = supabase.channel(`typing:${conversationId}`);
  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.payload.userId !== myUserId) {
        onTypingChange(payload.payload.isTyping);
      }
    })
    .subscribe();
  return channel;
}

export function broadcastTyping(channel: RealtimeChannel, myUserId: string, isTyping: boolean) {
  channel.send({ type: 'broadcast', event: 'typing', payload: { userId: myUserId, isTyping } });
}

/** Presencia: quién está conectado/viendo esta conversación ahora mismo. */
export function subscribeToPresence(
  conversationId: string,
  myUserId: string,
  onPresenceChange: (onlineUserIds: string[]) => void
): RealtimeChannel {
  const channel = supabase.channel(`presence:${conversationId}`, {
    config: { presence: { key: myUserId } },
  });
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onPresenceChange(Object.keys(state));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });
  return channel;
}

/**
 * Se suscribe a cualquier mensaje nuevo o actualizado en CUALQUIERA de las
 * conversaciones del usuario (sin filtro de columna) — RLS ya limita qué
 * filas llegan. Úsalo en pantallas de LISTA (no en el chat individual) para
 * refrescar último mensaje / contador de no leídos en tiempo real.
 */
export function subscribeToConversationUpdates(
  onChange: () => void
): RealtimeChannel {
  return supabase
    .channel('conversations-list-updates')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages' },
      () => onChange()
    )
    .subscribe();
}
/**
 * Obtiene la conversación existente con este proveedor (para este listing,
 * o general si no se pasa listing) o crea una nueva. Usado por el botón
 * "Contactar al proveedor" en Detalle de Equipo y Detalle de Paquete.
 */
export async function getOrCreateConversation(
  providerId: string,
  listingId?: string | null,
  packageId?: string | null
): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_provider_id: providerId,
    p_listing_id: listingId ?? null,
    p_package_id: packageId ?? null,
  });

  if (error) throw error;
  return data as string;
}
export type ConversationListingInfo = {
  listing_id: string;
  title: string | null;
  cover_image_url: string | null;
  daily_price: number;
};

/**
 * Trae info mínima del listing asociado a una conversación (si tiene uno),
 * para el header "hablando sobre: X" en el chat. No necesita RPC nueva:
 * RLS de conversations ya limita a filas donde el usuario es participante,
 * y listings publicados ya tienen lectura pública.
 */
export type ConversationAboutItem = {
  kind: 'listing' | 'package';
  id: string;
  title: string | null;
  cover_image_url: string | null;
  daily_price: number;
};

/**
 * Trae info mínima del listing O paquete asociado a una conversación (si
 * tiene alguno), para el header "hablando sobre: X" en el chat.
 */
export async function getConversationAboutItem(
  conversationId: string
): Promise<ConversationAboutItem | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      listing_id,
      package_id,
      listing:listings(id, title, cover_image_url, daily_price),
      package:packages(id, title, cover_image_url, daily_price)
    `)
    .eq('id', conversationId)
    .single();

  if (error) return null;

  const listing = Array.isArray((data as any).listing) ? (data as any).listing[0] : (data as any).listing;
  const pkg = Array.isArray((data as any).package) ? (data as any).package[0] : (data as any).package;

  if (data.listing_id && listing) {
    return { kind: 'listing', id: listing.id, title: listing.title, cover_image_url: listing.cover_image_url, daily_price: listing.daily_price };
  }
  if (data.package_id && pkg) {
    return { kind: 'package', id: pkg.id, title: pkg.title, cover_image_url: pkg.cover_image_url, daily_price: pkg.daily_price };
  }
  return null;
}
/**
 * Busca (sin crear) una conversación existente con este proveedor para
 * este listing/paquete. Usado por los botones "Contactar" para decidir si
 * abren una conversación real ya existente o entran en modo borrador.
 */
export async function findExistingConversation(
  providerId: string,
  listingId?: string | null,
  packageId?: string | null
): Promise<string | null> {
  let query = supabase.from('conversations').select('id').eq('provider_id', providerId);
  query = listingId ? query.eq('listing_id', listingId) : query.is('listing_id', null);
  query = packageId ? query.eq('package_id', packageId) : query.is('package_id', null);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data.id;
}
/** Archiva una conversación solo para el usuario actual (la otra parte no se entera). */
export async function archiveConversation(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('conversation_archived')
        .insert({ user_id: user.id, conversation_id: conversationId });

    if (error) console.error('[messagesService] archiveConversation:', error.message);
}

/** Desarchiva — la vuelve a mostrar en "Todos". */
export async function unarchiveConversation(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('conversation_archived')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

    if (error) console.error('[messagesService] unarchiveConversation:', error.message);
}

/** Elimina una conversación solo para el usuario actual — la otra parte la sigue viendo normal. */
export async function deleteConversationForMe(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('conversation_deleted')
        .insert({ user_id: user.id, conversation_id: conversationId });

    if (error) console.error('[messagesService] deleteConversationForMe:', error.message);
}