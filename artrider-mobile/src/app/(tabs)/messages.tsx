import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Pressable, Image, RefreshControl, useColorScheme, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { ProtectedScreen } from '@/components/protected-screen';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { getConversations, subscribeToConversationUpdates, type ConversationSummary } from '@/services/messagesService';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const s = new Date(start);
  if (!end) return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]}`;
  const e = new Date(end);
  return `${s.getUTCDate()} – ${e.getUTCDate()} de ${MONTHS[e.getUTCMonth()]}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function ConversationsContent() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const all = await getConversations();
    setConversations(all);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Realtime: cualquier mensaje nuevo/actualizado en cualquiera de mis
  // conversaciones recarga la lista (último mensaje + contador de no leídos).
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

  const filtered = query.trim()
    ? conversations.filter((c) => c.other_name.toLowerCase().includes(query.trim().toLowerCase()))
    : conversations;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header: título + búsqueda + ajustes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingTop: Spacing.two }}>
        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.text }}>Mensajes</ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Pressable
            onPress={() => setShowSearch((s) => !s)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundElement, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="search" size={17} color={colors.text} />
          </Pressable>
          <Pressable
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundElement, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="settings-outline" size={17} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {showSearch && (
        <View style={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.three }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: colors.backgroundElement, borderRadius: 999, paddingHorizontal: Spacing.three }}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar conversaciones"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={{ flex: 1, paddingVertical: 10, fontSize: 13.5, color: colors.text, fontFamily: 'Inter_400Regular' }}
            />
          </View>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
          <ThemedText style={{ color: colors.textSecondary }}>
            {conversations.length === 0 ? 'No tienes conversaciones todavía.' : 'Sin resultados.'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.three }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const dateRange = formatDateRange(item.booking_start_date, item.booking_end_date);
            const subtitle = [dateRange, item.listing_city].filter(Boolean).join(' · ');

            return (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/chat/[id]', params: { id: item.id, otherName: item.other_name } })
                }
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: 1, borderColor: colors.border }}
              >
                <View style={{ width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden' }}>
                  {item.cover_image_url ? (
                    <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText
                      numberOfLines={1}
                      style={{ fontFamily: item.unread_count > 0 ? 'Inter_700Bold' : 'Inter_600SemiBold', fontSize: 15, color: colors.text, flex: 1 }}
                    >
                      {item.other_name}
                      {item.equipment_title ? `, ${item.equipment_title}` : ''}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 11, color: colors.textSecondary, marginLeft: Spacing.two }}>
                      {timeAgo(item.last_message_time)}
                    </ThemedText>
                  </View>
                  <ThemedText
                    numberOfLines={1}
                    style={{ fontSize: 13, color: item.unread_count > 0 ? colors.text : colors.textSecondary, marginTop: 2 }}
                  >
                    {item.last_message_is_mine ? 'Tú: ' : ''}
                    {item.last_message_text ?? 'Sin mensajes todavía'}
                  </ThemedText>
                  {subtitle && (
                    <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {subtitle}
                    </ThemedText>
                  )}
                </View>
                {item.unread_count > 0 && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

export default function MessagesScreen() {
  return (
    <ProtectedScreen>
      <ConversationsContent />
    </ProtectedScreen>
  );
}