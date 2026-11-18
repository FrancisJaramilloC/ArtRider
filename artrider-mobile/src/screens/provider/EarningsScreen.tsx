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
import { usePricing } from '@/contexts/PricingContext';
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
} from '@/utils/earnings';
import { formatPrice, formatShortDate } from '@/utils/format';

const FILTER_OPTIONS: { value: EarningFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagada' },
];

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

function EarningCard({ row }: { row: EarningRow }) {
  const colors = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${row.title}, ${formatShortDate(row.startDate)}. Bruto ${formatPrice(row.gross)}, comisión ${formatPrice(row.fee)}, neto ${formatPrice(row.net)}. ${row.status === 'paid' ? 'Pagada' : 'Pendiente'}`}
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
          <Badge label={row.status === 'paid' ? 'Pagada' : 'Pendiente'} tone={row.status === 'paid' ? 'success' : 'warning'} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <Amount label="Pagó el Rider" value={formatPrice(row.gross)} />
        <Amount label="ArtRider" value={`−${formatPrice(row.fee)}`} />
        <Amount label={row.estimated ? 'Tu neto (aprox.)' : 'Tu neto'} value={formatPrice(row.net)} strong />
      </View>
      {row.commission !== null && row.serviceFee !== null ? (
        <Text variant="caption" color="textSecondary">
          ArtRider = comisión {formatPrice(row.commission)} + tarifa de servicio {formatPrice(row.serviceFee)}
          {row.fee - row.commission - row.serviceFee !== 0 ? ' + redondeo' : ''}
        </Text>
      ) : null}
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

/** Ganancias del Partner (solo lectura): resumen del mes, pendiente, total histórico y lista de reservas. */
export function EarningsScreen() {
  const colors = useTheme();
  const { gutter, insets, contentWidth } = useLayout();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [filter, setFilter] = useState<EarningFilter>('all');
  const { rates } = usePricing();

  const { data, status, error, refreshError, refreshing, reload, refresh } = useAsyncData<ProviderBooking[]>(getProviderBookings, { reloadOnFocus: true });

  const allRows = useMemo(() => toEarningRows(data ?? [], rates), [data, rates]);
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

      <SummaryCard emphasized label={isCurrentMonth ? 'Ganado este mes (neto)' : `Ganado en ${monthLabel} (neto)`} value={formatPrice(summary.monthNet)} hint="Recibes siempre tu precio. Reservas completadas con evento en este mes." />
      <View style={{ flexDirection: 'row', gap: Rhythm.cardGap }}>
        <SummaryCard label="Pendiente de cobro" value={formatPrice(summary.pendingNet)} />
        <SummaryCard label="Total histórico" value={formatPrice(summary.totalNet)} />
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
              title={filter === 'all' ? `Sin ganancias en ${monthLabel}` : filter === 'paid' ? 'Sin reservas pagadas este mes' : 'Sin reservas pendientes este mes'}
              description="Cuando completes reservas con evento en este mes, aparecerán aquí con su comisión y neto."
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
