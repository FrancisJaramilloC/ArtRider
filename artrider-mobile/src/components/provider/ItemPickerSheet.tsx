import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChipRow, type ChipOption } from '@/components/ui/ChipRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ModalScreen } from '@/components/ui/ModalScreen';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { CATEGORY_LABELS } from '@/constants/categories';
import { MinTouch, Radius, Rhythm, Spacing, Thumb } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import type { ErrorInfo } from '@/utils/errors';
import { formatPrice } from '@/utils/format';
import { highlightParts, matchesQuery, normalizeText, sectionLetter } from '@/utils/pickerSearch';
import { loadRecentIds, rememberId } from '@/utils/recentPicks';

/** Espera tras escribir antes de filtrar (evita recalcular miles de filas por cada tecla). */
const SEARCH_DEBOUNCE_MS = 250;
const MAX_RECENT_SHOWN = 5;
const ROW_MIN_HEIGHT = Thumb.list + Spacing.three * 2;

export type PickerItem = {
  id: string;
  title: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  cover_image_url: string | null;
  /** Precio por día en centavos. */
  daily_price: number;
  is_published: boolean;
  /** Reservas próximas o en curso de este equipo. */
  upcoming: number;
};

export type ItemPickerSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  items: PickerItem[];
  loading?: boolean;
  error?: ErrorInfo | null;
  onRetry?: () => void;
  /** `single`: tocar elige y cierra. `multi`: tocar marca/desmarca y se cierra con «Listo». */
  mode: 'single' | 'multi';
  /** Elegidos: id → cantidad (en `single` basta un id con 1). */
  selected: Record<string, number>;
  onPick: (id: string) => void;
  /** Solo `multi`: cambia la cantidad de un elegido. */
  onChangeQuantity?: (id: string, quantity: number) => void;
  /** Clave del almacenamiento de «Recientes» (una por tipo de selector). */
  recentsScope: string;
};

type FilterId = 'all' | 'upcoming' | 'paused' | `cat:${string}`;

type Row = { key: string; item: PickerItem };
type Section = { key: string; title: string; data: Row[] };

type Indexed = PickerItem & { searchText: string };

/** Parte el texto en tramos para resaltar la coincidencia (estilo claro sobre el color del tema). */
function Highlighted({ text, query, variant, numberOfLines }: { text: string; query: string; variant: 'bodyStrong' | 'caption'; numberOfLines?: number }) {
  const colors = useTheme();
  const parts = highlightParts(text, query);
  return (
    <Text variant={variant} color={variant === 'caption' ? 'textSecondary' : 'text'} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.match ? (
          <Text key={i} variant={variant} style={{ backgroundColor: colors.primarySoft, color: colors.primary }}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}

type PickerRowProps = { item: PickerItem; selected: boolean; query: string; onPress: (id: string) => void };

/** Fila del selector: foto con fondo neutro, título (2 líneas), categoría, precio e insignia de reservas. */
const PickerRow = memo(function PickerRow({ item, selected, query, onPress }: PickerRowProps) {
  const colors = useTheme();
  const category = item.category ? (CATEGORY_LABELS[item.category] ?? item.category) : null;
  const meta = [category, [item.brand, item.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${item.title ?? 'Equipo'}, ${formatPrice(item.daily_price)} por día${item.upcoming > 0 ? `, ${item.upcoming} reservas próximas` : ''}${selected ? ', seleccionado' : ''}`}
      style={({ pressed }) => ({
        minHeight: ROW_MIN_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.two,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: Thumb.list, height: Thumb.list, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.imageBackdrop, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        {item.cover_image_url ? (
          <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" recyclingKey={item.id} accessibilityIgnoresInvertColors />
        ) : (
          <Ionicons name="cube-outline" size={22} color={colors.textSecondary} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
        <Highlighted text={item.title ?? 'Equipo'} query={query} variant="bodyStrong" numberOfLines={2} />
        {meta ? <Highlighted text={meta} query={query} variant="caption" numberOfLines={1} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two }}>
          <Text variant="caption" color="textSecondary">
            {formatPrice(item.daily_price)}/día
          </Text>
          {item.upcoming > 0 ? <Badge label={`${item.upcoming} ${item.upcoming === 1 ? 'reserva próxima' : 'reservas próximas'}`} tone="accent" /> : null}
          {!item.is_published ? <Badge label="Pausado" tone="neutral" /> : null}
        </View>
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.primary : colors.textMuted} />
    </Pressable>
  );
});

/**
 * Selector de equipos para Partners con miles de anuncios: pantalla completa con buscador fijo (sin
 * tildes ni mayúsculas, con debounce y resaltado), filtros, «Recientes», «Con reservas próximas» y A–Z con
 * encabezados fijos. Lista virtualizada y filas memoizadas.
 */
export function ItemPickerSheet({ visible, title, onClose, items, loading = false, error = null, onRetry, mode, selected, onPick, onChangeQuantity, recentsScope }: ItemPickerSheetProps) {
  const colors = useTheme();
  const { gutter } = useLayout();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    loadRecentIds(recentsScope).then((ids) => {
      if (!cancelled) setRecentIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, recentsScope]);

  // Texto de búsqueda normalizado: se calcula una vez por equipo (título, marca, modelo y categoría).
  const indexed: Indexed[] = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        searchText: normalizeText([it.title, it.brand, it.model, it.category ? (CATEGORY_LABELS[it.category] ?? it.category) : null].filter(Boolean).join(' ')),
      })),
    [items],
  );
  const byId = useMemo(() => new Map(indexed.map((it) => [it.id, it])), [indexed]);

  const filterOptions: ChipOption<FilterId>[] = useMemo(() => {
    const categories = Array.from(new Set(items.map((i) => i.category).filter((c): c is string => !!c)));
    return [
      { id: 'all', label: 'Todos' },
      { id: 'upcoming', label: 'Con reservas' },
      { id: 'paused', label: 'Pausados' },
      ...categories.map((c) => ({ id: `cat:${c}` as FilterId, label: CATEGORY_LABELS[c] ?? c })),
    ];
  }, [items]);

  const isDefaultView = debounced.trim() === '' && filter === 'all';

  const sections: Section[] = useMemo(() => {
    const filtered = indexed.filter((it) => {
      if (!matchesQuery(it.searchText, debounced)) return false;
      if (filter === 'upcoming') return it.upcoming > 0;
      if (filter === 'paused') return !it.is_published;
      if (filter.startsWith('cat:')) return it.category === filter.slice(4);
      return true;
    });

    const out: Section[] = [];
    if (isDefaultView) {
      const recents = recentIds.map((id) => byId.get(id)).filter((x): x is Indexed => !!x).slice(0, MAX_RECENT_SHOWN);
      if (recents.length > 0) out.push({ key: 'recents', title: 'Recientes', data: recents.map((item) => ({ key: `r:${item.id}`, item })) });
      const upcoming = filtered.filter((it) => it.upcoming > 0).sort((a, b) => b.upcoming - a.upcoming).slice(0, MAX_RECENT_SHOWN * 2);
      if (upcoming.length > 0) out.push({ key: 'upcoming', title: 'Con reservas próximas', data: upcoming.map((item) => ({ key: `u:${item.id}`, item })) });
    }

    const sorted = [...filtered].sort((a, b) => normalizeText(a.title ?? '').localeCompare(normalizeText(b.title ?? ''), 'es'));
    const letters = new Map<string, Row[]>();
    for (const item of sorted) {
      const letter = sectionLetter(item.title ?? '');
      const list = letters.get(letter) ?? [];
      list.push({ key: `a:${item.id}`, item });
      letters.set(letter, list);
    }
    for (const [letter, data] of letters) out.push({ key: `l:${letter}`, title: letter, data });
    return out;
  }, [indexed, byId, debounced, filter, isDefaultView, recentIds]);

  const handlePress = useCallback(
    (id: string) => {
      onPick(id);
      rememberId(recentsScope, id, recentIds).then(setRecentIds);
      if (mode === 'single') {
        setQuery('');
        setDebounced('');
        setFilter('all');
      }
    },
    [onPick, recentsScope, recentIds, mode],
  );

  function clearSearch() {
    setQuery('');
    setDebounced('');
    setFilter('all');
  }

  const selectedEntries = Object.entries(selected);
  const resultCount = sections.reduce((n, s) => n + (s.key.startsWith('l:') ? s.data.length : 0), 0);

  function renderBody() {
    if (error) return <ErrorState fill error={error} onRetry={onRetry ?? (() => undefined)} />;
    if (loading) {
      return (
        <View style={{ paddingHorizontal: gutter, gap: Rhythm.cardGap, paddingTop: Rhythm.titleToContent }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={ROW_MIN_HEIGHT} radius={Radius.card} />
          ))}
        </View>
      );
    }
    if (items.length === 0) {
      return <EmptyState fill icon="cube-outline" title="No hay equipos" description="Cuando publiques equipos, podrás elegirlos aquí." />;
    }
    if (resultCount === 0) {
      return (
        <EmptyState
          fill
          icon="search-outline"
          title={debounced.trim() ? `No encontramos «${debounced.trim()}»` : 'Sin resultados con este filtro'}
          description="Prueba con otra palabra o quita los filtros."
          actionLabel="Limpiar búsqueda"
          onAction={clearSearch}
        />
      );
    }
    return (
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: Rhythm.section }}
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: colors.background, paddingHorizontal: gutter, paddingTop: Spacing.three, paddingBottom: Spacing.one }}>
            <Text variant="overline" color="textMuted" accessibilityRole="header">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={{ paddingHorizontal: gutter }}>
            <PickerRow item={row.item} selected={!!selected[row.item.id]} query={debounced} onPress={handlePress} />
          </View>
        )}
      />
    );
  }

  return (
    <ModalScreen visible={visible} title={title} onClose={onClose}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: Spacing.two }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por nombre, marca, modelo o categoría" onClear={clearSearch} />
        </View>
        {!loading && !error && items.length > 0 ? (
          <View style={{ paddingBottom: Spacing.two }}>
            <ChipRow options={filterOptions} value={filter} onChange={setFilter} />
          </View>
        ) : null}

        {mode === 'multi' && selectedEntries.length > 0 ? (
          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: Spacing.two }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: Spacing.two }}>
              {selectedEntries.map(([id, quantity]) => (
                <SelectedCard key={id} title={byId.get(id)?.title ?? 'Equipo'} quantity={quantity} onChange={(q) => onChangeQuantity?.(id, q)} onRemove={() => onPick(id)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ flex: 1 }}>{renderBody()}</View>

        {mode === 'multi' ? (
          <View style={{ paddingHorizontal: gutter, paddingTop: Spacing.three, paddingBottom: Spacing.three, borderTopWidth: 1, borderColor: colors.border, gap: Spacing.two }}>
            <Text variant="captionStrong" color={selectedEntries.length > 0 ? 'primary' : 'textSecondary'} accessibilityLiveRegion="polite">
              {selectedEntries.length === 0 ? 'Ningún equipo seleccionado' : `${selectedEntries.length} ${selectedEntries.length === 1 ? 'equipo seleccionado' : 'equipos seleccionados'}`}
            </Text>
            <Button label="Listo" onPress={onClose} />
          </View>
        ) : null}
      </View>
    </ModalScreen>
  );
}

/** Tarjeta de la franja fija de elegidos: nombre, cantidad con pasos de 44 y quitar. */
function SelectedCard({ title, quantity, onChange, onRemove }: { title: string; quantity: number; onChange: (q: number) => void; onRemove: () => void }) {
  const colors = useTheme();
  return (
    <View style={{ width: 200, backgroundColor: colors.backgroundElement, borderRadius: Radius.card, paddingLeft: Spacing.three, paddingVertical: Spacing.one, gap: Spacing.half }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="captionStrong" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Quitar ${title}`} style={{ width: MinTouch, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton icon="remove" label="Disminuir cantidad" variant="outline" disabled={quantity <= 1} onPress={() => onChange(Math.max(1, quantity - 1))} />
        <Text variant="subtitle" accessibilityLabel={`${quantity}`} style={{ minWidth: 32, textAlign: 'center' }}>
          {quantity}
        </Text>
        <IconButton icon="add" label="Aumentar cantidad" variant="outline" onPress={() => onChange(quantity + 1)} />
      </View>
    </View>
  );
}
