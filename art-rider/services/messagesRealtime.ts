import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message } from "@/services/messagesService";

const supabase = createClient();

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

const typingChannels: Record<string, RealtimeChannel> = {};

/** Canal de "escribiendo..." — no toca la base de datos, solo mensajes efímeros entre clientes conectados. */
export function subscribeToTyping(
  conversationId: string,
  myUserId: string,
  onTypingChange: (isTyping: boolean) => void
): RealtimeChannel {
  if (!typingChannels[conversationId]) {
    typingChannels[conversationId] = supabase.channel(`typing:${conversationId}`);
  }
  const channel = typingChannels[conversationId];
  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.payload.userId !== myUserId) {
        onTypingChange(payload.payload.isTyping);
      }
    })
    .subscribe();
  return channel;
}

export function broadcastTyping(conversationId: string, myUserId: string, isTyping: boolean) {
  const channel = typingChannels[conversationId];
  if (channel) {
    channel.send({ type: 'broadcast', event: 'typing', payload: { userId: myUserId, isTyping } });
  }
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
 * filas llegan.
 */
export function subscribeToConversationUpdates(
  userId: string,
  onChange: () => void
): RealtimeChannel {
  const channelName = `conversations-list-updates-${Math.random().toString(36).slice(2)}`;
  return supabase
    .channel(channelName)
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
