import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';

import { ProtectedScreen } from '@/components/protected-screen';
import { BookingListCard } from '@/components/bookings/BookingListCard';
import { OrderGroupCard } from '@/components/bookings/OrderGroupCard';
import { ChipRow } from '@/components/ui/ChipRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TabScreen } from '@/components/ui/TabScreen';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getClientBookings, type ClientBooking, type BookingStatus } from '@/services/bookingsService';

type FilterId = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

const FILTERS: { id: FilterId; label: string; statuses: BookingStatus[] | null }[] = [
  { id: 'all', label: 'Todas', statuses: null },
  { id: 'pending', label: 'Pendientes', statuses: ['AWAITING_SIGNATURES'] },
  { id: 'active', label: 'Activas', statuses: ['PAID', 'ACTIVE'] },
  { id: 'completed', label: 'Completadas', statuses: ['COMPLETED'] },
  { id: 'cancelled', label: 'Canceladas', statuses: ['CANCELLED'] },
];

/** Frase del estado vacío por filtro: siempre distinta del título. */
const EMPTY_TEXT: Record<FilterId, string> = {
  all: 'Cuando reserves un equipo, lo verás aquí con su estado.',
  pending: 'Aquí aparecen las reservas que esperan la respuesta del proveedor.',
  active: 'Aquí aparecen las reservas confirmadas y en curso.',
  completed: 'Aquí aparecerán las reservas que ya terminaron.',
  cancelled: 'Aquí aparecerán las reservas que se cancelaron.',
};

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
  const router = useRouter();
  const { gutter, bottomInset } = useLayout();

  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
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

  const statuses = FILTERS.find((f) => f.id === activeFilter)?.statuses ?? null;
  const filteredBookings = statuses ? bookings.filter((b) => statuses.includes(b.status)) : bookings;
  const rows = useMemo(() => groupBookings(filteredBookings), [filteredBookings]);

  return (
    <TabScreen title="Mis Reservas">
      <ChipRow options={FILTERS.map((f) => ({ id: f.id, label: f.label }))} value={activeFilter} onChange={setActiveFilter} />

      {loading ? (
        <View style={{ padding: gutter, gap: Rhythm.cardGap }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={104} radius={Radius.card} />
          ))}
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          fill
          icon="calendar-outline"
          title={activeFilter === 'all' ? 'Aún no tienes reservas' : 'Nada por aquí'}
          description={EMPTY_TEXT[activeFilter]}
          actionLabel="Explorar equipos"
          onAction={() => router.push('/(tabs)' as never)}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: gutter, paddingBottom: bottomInset + Spacing.four, gap: Rhythm.cardGap }}
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
    </TabScreen>
  );
}

export default function ReservationsScreen() {
  return (
    <ProtectedScreen>
      <ReservationsContent />
    </ProtectedScreen>
  );
}
