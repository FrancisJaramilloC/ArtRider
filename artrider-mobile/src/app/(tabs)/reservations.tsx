import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Pressable, ScrollView, RefreshControl, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ProtectedScreen } from '@/components/protected-screen';
import { BookingListCard } from '@/components/bookings/BookingListCard';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getClientBookings, type ClientBooking, type BookingStatus } from '@/services/bookingsService';

const FILTERS: { id: 'all' | BookingStatus[]; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: ['AWAITING_SIGNATURES'], label: 'Pendientes' },
  { id: ['PAID', 'ACTIVE'], label: 'Activas' },
  { id: ['COMPLETED'], label: 'Completadas' },
  { id: ['CANCELLED'], label: 'Canceladas' },
];

function ReservationsContent() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

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
  const filtered = filter === 'all' ? bookings : bookings.filter((b) => filter.includes(b.status));

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
          Mis Reservas
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.three }}
      >
        {FILTERS.map((f, i) => {
          const isActive = activeFilter === i;
          return (
            <Pressable
              key={f.label}
              onPress={() => setActiveFilter(i)}
              style={{
                paddingHorizontal: Spacing.three,
                paddingVertical: Spacing.two,
                borderRadius: 999,
                backgroundColor: isActive ? colors.primary : 'transparent',
                borderWidth: isActive ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: isActive ? '#fff' : colors.textSecondary }}>
                {f.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five }}>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
            No tienes reservas {activeFilter !== 0 ? 'en esta categoría' : 'todavía'}.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.booking_id}
          contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => <BookingListCard booking={item} onCancelled={load} />}
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