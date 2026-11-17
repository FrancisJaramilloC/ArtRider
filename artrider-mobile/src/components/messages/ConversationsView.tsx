import { useState } from 'react';
import { View, FlatList, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { ChipRow } from '@/components/ui/ChipRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { TabScreen } from '@/components/ui/TabScreen';
import { Text } from '@/components/ui/Text';
import { Radius, Rhythm, Spacing, Thumb } from '@/constants/theme';
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

/** Con tan pocas conversaciones se muestra una ayuda debajo de la lista. */
const FEW_CONVERSATIONS = 3;

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
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Rhythm.cardPadding,
          paddingVertical: Rhythm.cardPadding,
          borderBottomWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {/* Miniatura cuadrada con fondo neutro y borde: las fotos blancas no se funden con la pantalla. */}
      <View
        style={{
          width: Thumb.list,
          height: Thumb.list,
          borderRadius: Radius.xl,
          overflow: 'hidden',
          backgroundColor: colors.backgroundElement,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {item.cover_image_url ? (
          <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={150} cachePolicy="memory-disk" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Texto: minWidth 0 para que el título haga ellipsis en lugar de empujar la hora. */}
      <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
        <Text variant={unread ? 'bodyStrong' : 'body'} numberOfLines={1} style={unread ? undefined : { fontFamily: 'Inter_500Medium' }}>
          {title}
        </Text>
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

      {/* Hora y punto de no leído: siempre visibles a la derecha, dentro del margen. */}
      <View style={{ flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center', gap: Spacing.two, minWidth: Spacing.five }}>
        <Text variant="caption" color="textMuted">
          {timeAgo(item.last_message_time)}
        </Text>
        <View
          accessibilityLabel={unread ? 'Sin leer' : undefined}
          style={{ width: Spacing.snug, height: Spacing.snug, borderRadius: Radius.full, backgroundColor: unread ? colors.primary : 'transparent' }}
        />
      </View>
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
  /** Frase del estado vacío cuando no hay ninguna conversación. */
  emptyText: string;
  /** Ayuda bajo la lista cuando hay pocas conversaciones. */
  helpText?: string;
  /** Si se pasa, se muestra el botón «Explorar equipos» (ayuda y estado vacío). */
  onExplore?: () => void;
};

/** Lista de conversaciones (cliente y proveedor): búsqueda, filtro Todos/Archivados, vacío y carga. */
export function ConversationsView({ conversations, loading, refreshing, onRefresh, onOpen, onLongPress, emptyText, helpText, onExplore }: ConversationsViewProps) {
  const colors = useTheme();
  const { gutter, bottomInset } = useLayout();
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<'all' | 'archived'>('all');

  const byFilter = conversations.filter((c) => (filter === 'archived' ? c.is_archived : !c.is_archived));
  const filtered = query.trim() ? byFilter.filter((c) => c.other_name.toLowerCase().includes(query.trim().toLowerCase())) : byFilter;
  const showHelp = !!helpText && filter === 'all' && !query.trim() && filtered.length > 0 && filtered.length <= FEW_CONVERSATIONS;

  return (
    <TabScreen
      title="Mensajes"
      actions={<IconButton icon={showSearch ? 'close' : 'search'} label={showSearch ? 'Cerrar búsqueda' : 'Buscar conversaciones'} onPress={() => setShowSearch((s) => !s)} />}
    >
      {showSearch && (
        <View style={{ paddingHorizontal: gutter, paddingBottom: Spacing.three }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar conversaciones" onClear={() => setQuery('')} />
        </View>
      )}

      <ChipRow
        options={[
          { id: 'all', label: 'Todos' },
          { id: 'archived', label: 'Archivados' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {loading ? (
        <View style={{ padding: gutter, gap: Spacing.four }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: Rhythm.cardPadding, alignItems: 'center' }}>
              <Skeleton width={Thumb.list} height={Thumb.list} radius={Radius.xl} />
              <View style={{ flex: 1, gap: Spacing.two }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="85%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          fill
          icon="chatbubbles-outline"
          title={filter === 'archived' ? 'Sin archivados' : conversations.length === 0 ? 'Aún no hay mensajes' : 'Sin resultados'}
          description={filter === 'archived' ? 'No tienes conversaciones archivadas.' : conversations.length === 0 ? emptyText : 'Prueba con otra búsqueda.'}
          actionLabel={conversations.length === 0 && onExplore ? 'Explorar equipos' : undefined}
          onAction={conversations.length === 0 ? onExplore : undefined}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Spacing.two, paddingBottom: bottomInset + Spacing.four }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => <ConversationRow item={item} onOpen={() => onOpen(item)} onLongPress={() => onLongPress(item)} />}
          ListFooterComponent={
            showHelp ? (
              <View style={{ alignItems: 'center', gap: Spacing.three, paddingTop: Rhythm.section }}>
                <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
                  {helpText}
                </Text>
                {onExplore ? <Button label="Explorar equipos" onPress={onExplore} variant="tonal" size="sm" style={{ alignSelf: 'center' }} /> : null}
              </View>
            ) : undefined
          }
        />
      )}
    </TabScreen>
  );
}
