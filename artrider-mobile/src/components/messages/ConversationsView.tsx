import { useState } from 'react';
import { View, FlatList, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import type { ConversationSummary } from '@/services/messagesService';
import { formatShortDate } from '@/utils/format';

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const s = new Date(start);
  if (!end) return formatShortDate(start);
  const e = new Date(end);
  const month = formatShortDate(end).split(' ')[1];
  return `${s.getUTCDate()} – ${e.getUTCDate()} de ${month}`;
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

const THUMB = 56;

function ConversationRow({ item, onOpen, onLongPress }: { item: ConversationSummary; onOpen: () => void; onLongPress: () => void }) {
  const colors = useTheme();
  const unread = item.unread_count > 0;
  const dateRange = formatDateRange(item.booking_start_date, item.booking_end_date);
  const subtitle = [dateRange, item.listing_city].filter(Boolean).join(' · ');
  const title = `${item.other_name}${item.equipment_title ? `, ${item.equipment_title}` : ''}`;

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${unread ? 'Mensajes sin leer. ' : ''}${item.last_message_text ?? 'Sin mensajes todavía'}`}
      accessibilityHint="Mantén pulsado para archivar o eliminar"
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: 1, borderColor: colors.border }}
    >
      <View style={{ width: THUMB, height: THUMB, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
        {item.cover_image_url ? (
          <Image source={{ uri: item.cover_image_url }} style={{ width: THUMB, height: THUMB }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Text variant={unread ? 'bodyStrong' : 'body'} numberOfLines={1} style={{ flex: 1, fontFamily: unread ? undefined : 'Inter_500Medium' }}>
            {title}
          </Text>
          <Text variant="caption" color="textMuted">
            {timeAgo(item.last_message_time)}
          </Text>
        </View>
        <Text variant="caption" color={unread ? 'text' : 'textSecondary'} numberOfLines={1}>
          {item.last_message_is_mine ? 'Tú: ' : ''}
          {item.last_message_text ?? 'Sin mensajes todavía'}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {unread && <View accessibilityLabel="Sin leer" style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
    </Pressable>
  );
}

export type ConversationsViewProps = {
  conversations: ConversationSummary[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (item: ConversationSummary) => void;
  onLongPress: (item: ConversationSummary) => void;
  /** Texto del estado vacío cuando no hay ninguna conversación. */
  emptyText: string;
};

/** Lista de conversaciones (cliente y proveedor): búsqueda, filtro Todos/Archivados, vacío y carga. */
export function ConversationsView({ conversations, loading, refreshing, onRefresh, onOpen, onLongPress, emptyText }: ConversationsViewProps) {
  const colors = useTheme();
  const { gutter, contentWidth } = useLayout();
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<'all' | 'archived'>('all');

  const byFilter = conversations.filter((c) => (filter === 'archived' ? c.is_archived : !c.is_archived));
  const filtered = query.trim() ? byFilter.filter((c) => c.other_name.toLowerCase().includes(query.trim().toLowerCase())) : byFilter;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: gutter, paddingRight: gutter - 2, paddingTop: Spacing.two }}>
        <Text variant="title" accessibilityRole="header">
          Mensajes
        </Text>
        <IconButton icon={showSearch ? 'close' : 'search'} label={showSearch ? 'Cerrar búsqueda' : 'Buscar conversaciones'} onPress={() => setShowSearch((s) => !s)} />
      </View>

      {showSearch && (
        <View style={{ paddingHorizontal: gutter, paddingTop: Spacing.two }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar conversaciones" onClear={() => setQuery('')} />
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: Spacing.two, paddingHorizontal: gutter, paddingTop: Spacing.three }}>
        {(['all', 'archived'] as const).map((f) => (
          <Chip key={f} label={f === 'all' ? 'Todos' : 'Archivados'} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      {loading ? (
        <View style={{ padding: gutter, gap: Spacing.four }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center' }}>
              <Skeleton width={THUMB} height={THUMB} radius={Radius.xl} />
              <View style={{ flex: 1, gap: Spacing.two }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="85%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={filter === 'archived' ? 'Sin archivados' : conversations.length === 0 ? 'Aún no hay mensajes' : 'Sin resultados'}
          description={filter === 'archived' ? 'No tienes conversaciones archivadas.' : conversations.length === 0 ? emptyText : 'Sin resultados.'}
          style={{ flex: 1 }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Spacing.two, paddingBottom: Spacing.six, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => <ConversationRow item={item} onOpen={() => onOpen(item)} onLongPress={() => onLongPress(item)} />}
        />
      )}
    </SafeAreaView>
  );
}
