import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { ProtectedScreen } from '@/components/protected-screen';
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

function ConversationsContent() {
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const all = await getConversations();
    setConversations(all);
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
      emptyText="No tienes conversaciones todavía."
    />
  );
}

export default function MessagesScreen() {
  return (
    <ProtectedScreen>
      <ConversationsContent />
    </ProtectedScreen>
  );
}
