import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getProviderBookings, type ProviderBooking } from '@/services/providerService';
import {
  currentMonthKey,
  monthKeyLabel,
  rowsOfMonth,
  shiftMonthKey,
  summarize,
  toEarningRows,
  type EarningFilter,
  type EarningRow,
  type EarningStatus,
} from '@/utils/earnings';
import { formatPrice, formatShortDate } from '@/utils/format';

const FILTER_OPTIONS: { value: EarningFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'earned', label: 'Ganadas' },
  { value: 'toCollect', label: 'Por cobrar' },
  { value: 'awaiting', label: 'Pendientes' },
];

const STATUS_BADGE: Record<EarningStatus, { label: string; tone: 'success' | 'neutral' | 'warning' }> = {
  earned: { label: 'Ganada', tone: 'success' },
  toCollect: { label: 'Por cobrar', tone: 'neutral' },
  awaiting: { label: 'Pendiente de tu respuesta', tone: 'warning' },
};

function SummaryCard({ label, value, hint, emphasized = false }: { label: string; value: string; hint?: string; emphasized?: boolean }) {
  const colors = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flex: emphasized ? undefined : 1,
        minWidth: 0,
        gap: Spacing.one,
        padding: Rhythm.cardPadding + Spacing.one,
        borderRadius: Radius.card,
        backgroundColor: emphasized ? colors.primarySoft : colors.backgroundElement,
      }}
    >
      <Text variant="caption" color={emphasized ? 'primary' : 'textSecondary'} numberOfLines={2}>
        {label}
      </Text>
      <Text variant={emphasized ? 'display' : 'title'} color={emphasized ? 'primary' : 'text'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function Amount({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'body'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {value}
      </Text>
    </View>
  );
}

/** Una reserva: solo lo que gana el Partner. Nunca el total del Rider, la comisión ni la tarifa de servicio. */
function EarningCard({ row }: { row: EarningRow }) {
  const colors = useTheme();
  const badge = STATUS_BADGE[row.status];
  const amountLabel = row.status === 'earned' ? 'Ganaste' : 'Ganarás';
  return (
    <View
      accessible
      accessibilityLabel={`${row.title}, ${formatShortDate(row.startDate)}. ${amountLabel} ${formatPrice(row.net)}${row.estimated ? ' aproximadamente' : ''}. ${badge.label}`}
      style={{ gap: Rhythm.cardPadding, padding: Rhythm.cardPadding + Spacing.one, borderRadius: Radius.card, backgroundColor: colors.backgroundElement }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }}>
        <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {row.title}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {formatShortDate(row.startDate)}
            {row.client ? ` · ${row.client}` : ''}
          </Text>
        </View>
        <View style={{ flexShrink: 0 }}>
          <Badge label={badge.label} tone={badge.tone} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <Amount label={row.estimated ? `${amountLabel} (aprox.)` : amountLabel} value={formatPrice(row.net)} strong />
      </View>
    </View>
  );
}

/** «Datos para cobrar»: solo un aviso. No se piden datos bancarios en esta etapa. */
function PayoutNotice() {
  const colors = useTheme();
  return (
    <View
      style={{ marginTop: Rhythm.section, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Rhythm.cardPadding + Spacing.one, borderRadius: Radius.card, backgroundColor: colors.backgroundElement }}
    >
      <Ionicons name="card-outline" size={22} color={colors.textSecondary} />
      <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
        <Text variant="bodyStrong">Datos para cobrar</Text>
        <Text variant="caption" color="textSecondary">
          Próximamente podrás registrar aquí cómo recibir tus pagos.
        </Text>
      </View>
      <Badge label="Próximamente" tone="neutral" />
    </View>
  );
}

/** Ganancias del Partner (solo lectura, siempre en lo que él gana): ganado del mes, por cobrar, pendiente de respuesta y total histórico. */
export function EarningsScreen() {
  const colors = useTheme();
  const { gutter, insets, contentWidth } = useLayout();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [filter, setFilter] = useState<EarningFilter>('all');
  const { data, status, error, refreshError, refreshing, reload, refresh } = useAsyncData<ProviderBooking[]>(getProviderBookings, { reloadOnFocus: true });

  const allRows = useMemo(() => toEarningRows(data ?? []), [data]);
  const summary = useMemo(() => summarize(allRows, monthKey), [allRows, monthKey]);
  const rows = useMemo(() => rowsOfMonth(allRows, monthKey, filter), [allRows, monthKey, filter]);

  const thisMonth = currentMonthKey();
  const isCurrentMonth = monthKey === thisMonth;
  const monthLabel = monthKeyLabel(monthKey);

  const header = (
    <View style={{ gap: Rhythm.cardGap, paddingBottom: Rhythm.cardGap }}>
      {refreshError ? <RefreshErrorNotice error={refreshError} onRetry={reload} /> : null}

      {/* Selector de mes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevron-back" label="Mes anterior" onPress={() => setMonthKey((key) => shiftMonthKey(key, -1))} />
        <Text variant="subtitle" accessibilityRole="header" accessibilityLiveRegion="polite">
          {monthLabel}
        </Text>
        <IconButton icon="chevron-forward" label="Mes siguiente" onPress={() => setMonthKey((key) => shiftMonthKey(key, 1))} disabled={isCurrentMonth} />
      </View>

      <SummaryCard emphasized label={isCurrentMonth ? 'Ganado este mes' : `Ganado en ${monthLabel}`} value={formatPrice(summary.monthNet)} hint="Recibes siempre tu precio. Solo reservas completadas con evento en este mes." />
      <View style={{ flexDirection: 'row', gap: Rhythm.cardGap }}>
        <SummaryCard label="Por cobrar" value={formatPrice(summary.toCollectNet)} hint="Reservas aceptadas" />
        <SummaryCard label="Pendiente de tu respuesta" value={formatPrice(summary.awaitingNet)} hint="Por aceptar o rechazar" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <SummaryCard label="Total ganado (histórico)" value={formatPrice(summary.totalNet)} />
      </View>

      <View style={{ marginTop: Spacing.two, gap: Rhythm.titleToContent }}>
        <Text variant="headline" accessibilityRole="header">
          Reservas de {monthLabel}
        </Text>
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader title="Ganancias" />

      {status === 'error' ? (
        <ErrorState fill error={error} onRetry={reload} />
      ) : status === 'loading' ? (
        <View style={{ padding: gutter, gap: Rhythm.cardGap }}>
          <Skeleton height={112} radius={Radius.card} />
          <Skeleton height={88} radius={Radius.card} />
          <Skeleton height={132} radius={Radius.card} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => <EarningCard row={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="cash-outline"
              title={filter === 'all' ? `Sin ganancias en ${monthLabel}` : filter === 'earned' ? 'Sin reservas ganadas este mes' : filter === 'toCollect' ? 'Sin reservas por cobrar este mes' : 'Sin reservas pendientes este mes'}
              description="Las reservas con evento en este mes aparecerán aquí con lo que ganas."
            />
          }
          ListFooterComponent={<PayoutNotice />}
          // Único margen inferior: safe area + 24 (pantalla fuera de las pestañas, sin barra flotante).
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.four,
            gap: Rhythm.cardGap,
            width: '100%',
            maxWidth: contentWidth,
            alignSelf: 'center',
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}
