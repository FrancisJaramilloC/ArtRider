import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, useColorScheme, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { getConversations, subscribeToConversationUpdates, type ConversationSummary } from '@/services/messagesService';
import { getMyProviderProfile } from '@/services/providerService';

export function ProviderMessagesScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
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

  // Realtime: cualquier mensaje nuevo/actualizado en cualquiera de mis
  // conversaciones (como proveedor) recarga la lista.
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: Spacing.four, paddingVertical: Spacing.three }}>
        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text }}>
          Mensajes
        </ThemedText>
      </View>
      {conversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five }}>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Todavía no tienes conversaciones con clientes.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.four, gap: Spacing.two }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/chat/[id]', params: { id: item.id, otherName: item.other_name } })
              }
              style={{
                backgroundColor: colors.backgroundElement,
                borderRadius: Radius.lg,
                padding: Spacing.three,
              }}
            >
              <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text, marginBottom: 2 }}>
                {item.other_name}
              </ThemedText>
              <ThemedText numberOfLines={1} style={{ fontSize: 13, color: colors.textSecondary }}>
                {item.last_message_text ?? 'Sin mensajes todavía'}
              </ThemedText>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}