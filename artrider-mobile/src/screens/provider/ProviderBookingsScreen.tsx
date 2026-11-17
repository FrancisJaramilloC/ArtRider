import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProviderBookingCard } from '@/components/provider/ProviderBookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getProviderBookings, type ProviderBooking } from '@/services/providerService';
import { SEGMENT_OPTIONS, isBookingSegment, segmentOf, type BookingSegment } from '@/utils/providerBookings';

type EmptyCopy = {
  icon: 'hourglass-outline' | 'calendar-outline' | 'play-circle-outline' | 'time-outline';
  title: string;
  description: string;
  actionLabel: string;
  /** Otro segmento de esta lista o una ruta. */
  target: string;
};

/** Estado vacío propio de cada segmento, con un botón que lleva a donde sigue el trabajo. */
const EMPTY: Record<BookingSegment, EmptyCopy> = {
  pending: {
    icon: 'hourglass-outline',
    title: 'Sin solicitudes pendientes',
    description: 'Cuando alguien reserve uno de tus equipos, la solicitud aparecerá aquí para que la aceptes.',
    actionLabel: 'Ver próximas',
    target: 'upcoming',
  },
  upcoming: {
    icon: 'calendar-outline',
    title: 'No tienes reservas próximas',
    description: 'Las reservas aceptadas que aún no empiezan se muestran aquí.',
    actionLabel: 'Ver calendario',
    target: '/(provider)/calendar',
  },
  inProgress: {
    icon: 'play-circle-outline',
    title: 'Nada en curso ahora',
    description: 'Aquí verás los equipos que están rentados en este momento.',
    actionLabel: 'Ver próximas',
    target: 'upcoming',
  },
  history: {
    icon: 'time-outline',
    title: 'Aún no hay historial',
    description: 'Las reservas completadas o canceladas se guardan aquí.',
    actionLabel: 'Ver mis equipos',
    target: '/(provider)/listings',
  },
};

export function ProviderBookingsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { gutter, insets, contentWidth } = useLayout();
  const params = useLocalSearchParams<{ segment?: string }>();
  const [segment, setSegment] = useState<BookingSegment>(isBookingSegment(params.segment) ? params.segment : 'pending');

  const { data, status, error, refreshError, refreshing, reload, refresh } = useAsyncData<ProviderBooking[]>(getProviderBookings, {
    reloadOnFocus: true,
  });

  const rows = useMemo(() => {
    const now = new Date();
    const list = (data ?? []).filter((b) => segmentOf(b, now) === segment);
    const byStart = (a: ProviderBooking, b: ProviderBooking) => a.start_date.localeCompare(b.start_date);
    // Lo más cercano primero; el historial, lo más reciente primero.
    return segment === 'history' ? list.sort((a, b) => byStart(b, a)) : list.sort(byStart);
  }, [data, segment]);

  const pendingCount = useMemo(() => {
    const now = new Date();
    return (data ?? []).filter((b) => segmentOf(b, now) === 'pending').length;
  }, [data]);

  const empty = EMPTY[segment];
  function goTo(target: string) {
    if (isBookingSegment(target)) setSegment(target);
    else router.push(target as never);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader title="Reservas" />
      <View style={{ paddingHorizontal: gutter, paddingBottom: Rhythm.titleToContent, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}>
        <SegmentedControl
          options={SEGMENT_OPTIONS.map((o) => (o.value === 'pending' && pendingCount > 0 ? { ...o, label: `${o.label} ${pendingCount}` } : o))}
          value={segment}
          onChange={setSegment}
        />
      </View>

      {status === 'error' ? (
        <ErrorState fill error={error} onRetry={reload} />
      ) : status === 'loading' ? (
        <View style={{ padding: gutter, gap: Rhythm.cardGap }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={132} radius={Radius.card} />
          ))}
        </View>
      ) : rows.length === 0 ? (
        <EmptyState fill icon={empty.icon} title={empty.title} description={empty.description} actionLabel={empty.actionLabel} onAction={() => goTo(empty.target)} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(b) => b.booking_id}
          ListHeaderComponent={refreshError ? <RefreshErrorNotice error={refreshError} onRetry={reload} /> : undefined}
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.four,
            gap: Rhythm.cardGap,
            width: '100%',
            maxWidth: contentWidth,
            alignSelf: 'center',
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <ProviderBookingCard
              booking={item}
              onOpen={() => router.push({ pathname: '/provider/booking/[id]', params: { id: item.booking_id } } as never)}
              onChanged={reload}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
