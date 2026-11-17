import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { ProtectedScreen } from '@/components/protected-screen';
import { ConversationsView } from '@/components/messages/ConversationsView';
import { useAsyncData } from '@/hooks/useAsyncData';
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

  const { data, status, error, refreshError, refreshing, reload, refresh } = useAsyncData<ConversationSummary[]>(getConversations);
  const conversations = data ?? [];

  // Realtime: ante un cambio se recarga en silencio (si falla, se conservan los datos).
  useEffect(() => {
    const channel = subscribeToConversationUpdates(() => {
      reload();
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

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
            reload();
          },
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteConversationForMe(item.id);
            reload();
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  return (
    <ConversationsView
      conversations={conversations}
      loading={status === 'loading'}
      refreshing={refreshing}
      onRefresh={refresh}
      error={error}
      refreshError={refreshError}
      onRetry={reload}
      onOpen={(item) => router.push({ pathname: '/chat/[id]', params: { id: item.id, otherName: item.other_name } })}
      onLongPress={handleLongPress}
      emptyText="Cuando consultes o reserves un equipo, tus conversaciones aparecerán aquí."
      helpText="Las conversaciones aparecen al consultar o reservar un equipo."
      onExplore={() => router.push("/(tabs)" as never)}
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
