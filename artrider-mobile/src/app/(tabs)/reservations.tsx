import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProtectedScreen } from '@/components/protected-screen';
import { BookingListCard } from '@/components/bookings/BookingListCard';
import { OrderGroupCard } from '@/components/bookings/OrderGroupCard';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getClientBookings, type ClientBooking, type BookingStatus } from '@/services/bookingsService';

const FILTERS: { id: 'all' | BookingStatus[]; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: ['AWAITING_SIGNATURES'], label: 'Pendientes' },
  { id: ['PAID', 'ACTIVE'], label: 'Activas' },
  { id: ['COMPLETED'], label: 'Completadas' },
  { id: ['CANCELLED'], label: 'Canceladas' },
];

type ListRow =
  | { kind: 'single'; key: string; booking: ClientBooking }
  | { kind: 'group'; key: string; bookings: ClientBooking[] };

function groupBookings(bookings: ClientBooking[]): ListRow[] {
  const groups = new Map<string, ClientBooking[]>();
  const singles: ClientBooking[] = [];

  for (const b of bookings) {
    if (b.order_id) {
      const arr = groups.get(b.order_id) ?? [];
      arr.push(b);
      groups.set(b.order_id, arr);
    } else {
      singles.push(b);
    }
  }

  const rows: ListRow[] = [];
  for (const b of singles) {
    rows.push({ kind: 'single', key: b.booking_id, booking: b });
  }
  for (const [orderId, items] of groups) {
    rows.push({ kind: 'group', key: orderId, bookings: items });
  }

  // Reordena todo por la fecha de creación más reciente del grupo/reserva.
  rows.sort((a, b) => {
    const dateA = a.kind === 'single' ? a.booking.created_at : a.bookings[0].created_at;
    const dateB = b.kind === 'single' ? b.booking.created_at : b.bookings[0].created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return rows;
}

function ReservationsContent() {
  const colors = useTheme();
  const { gutter, contentWidth } = useLayout();

  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getClientBookings();
    setBookings(data);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filter = FILTERS[activeFilter].id;
  const filteredBookings = filter === 'all' ? bookings : bookings.filter((b) => filter.includes(b.status));
  const rows = useMemo(() => groupBookings(filteredBookings), [filteredBookings]);

  const header = (
    <>
      <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.three }}>
        <Text variant="title" accessibilityRole="header">
          Mis Reservas
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: gutter, paddingBottom: Spacing.three }}
      >
        {FILTERS.map((f, i) => (
          <Chip key={f.label} label={f.label} active={activeFilter === i} onPress={() => setActiveFilter(i)} />
        ))}
      </ScrollView>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        {header}
        <View style={{ padding: gutter, gap: Spacing.three }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={104} radius={Radius.card} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {header}

      {rows.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={activeFilter !== 0 ? 'Nada por aquí' : 'Aún no tienes reservas'}
          description={`No tienes reservas ${activeFilter !== 0 ? 'en esta categoría' : 'todavía'}.`}
          style={{ flex: 1 }}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: gutter,
            paddingBottom: Spacing.six,
            gap: Spacing.three,
            width: '100%',
            maxWidth: contentWidth,
            alignSelf: 'center',
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) =>
            item.kind === 'single' ? (
              <BookingListCard booking={item.booking} onCancelled={load} />
            ) : (
              <OrderGroupCard bookings={item.bookings} onCancelled={load} />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

export default function ReservationsScreen() {
  return (
    <ProtectedScreen>
      <ReservationsContent />
    </ProtectedScreen>
  );
}
