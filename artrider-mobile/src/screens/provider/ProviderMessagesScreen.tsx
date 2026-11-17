import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { ConversationsView } from '@/components/messages/ConversationsView';
import { supabase } from '@/services/supabase';
import {
  getConversations,
  subscribeToConversationUpdates,
  archiveConversation,
  unarchiveConversation,
  deleteConversationForMe,
  type ConversationSummary,
} from '@/services/messagesService';
import { getMyProviderProfile } from '@/services/providerService';

export function ProviderMessagesScreen() {
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const profile = await getMyProviderProfile();
    if (!profile) {
      setConversations([]);
      return;
    }
    const all = await getConversations();
    setConversations(all.filter((c) => c.provider_id === profile.id));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const channel = subscribeToConversationUpdates(() => {
      load();
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handleLongPress(item: ConversationSummary) {
    Alert.alert(
      item.other_name,
      undefined,
      [
        {
          text: item.is_archived ? 'Desarchivar' : 'Archivar',
          onPress: async () => {
            if (item.is_archived) {
              await unarchiveConversation(item.id);
            } else {
              await archiveConversation(item.id);
            }
            load();
          },
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteConversationForMe(item.id);
            load();
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  return (
    <ConversationsView
      conversations={conversations}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onOpen={(item) => router.push({ pathname: '/chat/[id]', params: { id: item.id, otherName: item.other_name } })}
      onLongPress={handleLongPress}
      emptyText="Cuando un cliente te consulte sobre un equipo, la conversación aparecerá aquí."
      helpText="Las conversaciones aparecen cuando un cliente te consulta o reserva."
    />
  );
}
