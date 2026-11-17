import { useState, type ReactNode } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MonthCalendar } from '@/components/provider/MonthCalendar';
import { ProviderBookingCard } from '@/components/provider/ProviderBookingCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { ModalScreen } from '@/components/ui/ModalScreen';
import { SearchBar } from '@/components/ui/SearchBar';
import { Sheet } from '@/components/ui/Sheet';
import { ScreenSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { TabScreen } from '@/components/ui/TabScreen';
import { Text } from '@/components/ui/Text';
import { BOOKING_STATUS_LABELS, Radius, Rhythm, Spacing, Thumb } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getMyListings, type MyListing } from '@/services/providerCatalogService';
import { getListingCalendar, getProviderBookings, toggleBlockDate, type CalendarMark, type ProviderBooking } from '@/services/providerService';
import { formatDayLong } from '@/utils/calendar';
import { formatPrice } from '@/utils/format';
import { formatDateRange } from '@/utils/providerBookings';

type CalendarBundle = { bookings: ProviderBooking[]; listings: MyListing[] };
type DaySheet = { date: string; kind: 'free' | 'blocked' | 'booked' };

/** Alto reservado al calendario mientras carga (6 semanas × 44 + cabecera). */
const CALENDAR_PLACEHOLDER_HEIGHT = 360;

function LegendItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
      {children}
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

export default function ProviderCalendarScreen() {
  const { gutter, bottomInset, contentWidth } = useLayout();
  const colors = useTheme();
  const router = useRouter();

  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [daySheet, setDaySheet] = useState<DaySheet | null>(null);
  const [toggling, setToggling] = useState(false);

  const base = useAsyncData<CalendarBundle>(
    async () => {
      const [bookings, listings] = await Promise.all([getProviderBookings(), getMyListings()]);
      return { bookings, listings };
    },
    { reloadOnFocus: true },
  );
  const myListings = base.data?.listings ?? [];
  const allBookings = base.data?.bookings ?? [];
  const listingId = selectedListingId ?? myListings[0]?.id ?? null;

  const calendar = useAsyncData<CalendarMark[]>(() => getListingCalendar(listingId as string), { enabled: !!listingId, deps: [listingId] });
  const marks = calendar.data ?? [];

  const selectedListing = myListings.find((l) => l.id === listingId) ?? null;
  const bookingsForListing = allBookings.filter((b) => b.listing_id === listingId);
  const pendingFirst = [...bookingsForListing].sort((a, b) => Number(b.status === 'AWAITING_SIGNATURES') - Number(a.status === 'AWAITING_SIGNATURES'));
  const pendingCount = bookingsForListing.filter((b) => b.status === 'AWAITING_SIGNATURES').length;

  const filteredPickerListings = pickerQuery.trim()
    ? myListings.filter((l) => (l.title ?? '').toLowerCase().includes(pickerQuery.trim().toLowerCase()))
    : myListings;

  function bookingOn(date: string): ProviderBooking | null {
    return (
      bookingsForListing.find(
        (b) => b.status !== 'CANCELLED' && b.status !== 'ARCHIVED' && b.start_date.slice(0, 10) <= date && date <= b.end_date.slice(0, 10),
      ) ?? null
    );
  }

  /** Mismo bloqueo/liberación de antes (`toggleBlockDate`); solo cambia desde dónde se dispara. */
  async function toggleDay(date: string) {
    if (!listingId || toggling) return;
    setToggling(true);
    const result = await toggleBlockDate(listingId, date);
    setToggling(false);
    setDaySheet(null);
    if (result.error) {
      Alert.alert('No se pudo bloquear', result.error);
      return;
    }
    calendar.setData((prev) => {
      const list = prev ?? [];
      return result.mark === 'blocked' ? [...list, { date, mark: 'blocked' }] : list.filter((m) => m.date !== date);
    });
  }

  if (base.status === 'loading') {
    return (
      <TabScreen title="Calendario">
        <ScreenSkeleton />
      </TabScreen>
    );
  }

  if (base.status === 'error') {
    return (
      <TabScreen title="Calendario">
        <ErrorState fill error={base.error} onRetry={base.reload} />
      </TabScreen>
    );
  }

  if (myListings.length === 0) {
    return (
      <TabScreen title="Calendario">
        <EmptyState
          fill
          icon="calendar-outline"
          title="Aún no hay calendario"
          description="Publica al menos un equipo para gestionar su calendario."
          actionLabel="Publicar mi primer equipo"
          onAction={() => router.push('/provider/new-listing' as never)}
        />
      </TabScreen>
    );
  }

  const sheetBooking = daySheet?.kind === 'booked' ? bookingOn(daySheet.date) : null;

  return (
    <TabScreen title="Calendario">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={base.refreshing} onRefresh={async () => { await Promise.all([base.refresh(), calendar.reload()]); }} tintColor={colors.primary} />}
        // Todo el contenido se alcanza: el último bloque queda por encima de la barra de pestañas.
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Spacing.two, paddingBottom: bottomInset + Spacing.four, gap: Rhythm.titleToContent, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
      >
        {base.refreshError ? <RefreshErrorNotice error={base.refreshError} onRetry={base.reload} /> : null}

        {/* Selector de equipo: tarjeta que abre un buscador (escala a cientos de equipos). */}
        <Pressable
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`Equipo seleccionado: ${selectedListing?.title ?? 'ninguno'}. Cambiar`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding, opacity: pressed ? 0.85 : 1 })}
        >
          <View style={{ width: Thumb.compact, height: Thumb.compact, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.imageBackdrop }}>
            {selectedListing?.cover_image_url ? (
              <Image source={{ uri: selectedListing.cover_image_url }} style={{ width: Thumb.compact, height: Thumb.compact }} contentFit="contain" transition={150} cachePolicy="memory-disk" />
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="caption" color="textSecondary">
              Equipo seleccionado
            </Text>
            <Text variant="bodyStrong" numberOfLines={1}>
              {selectedListing?.title ?? 'Elige un equipo'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>

        {calendar.status === 'loading' ? (
          <Skeleton height={CALENDAR_PLACEHOLDER_HEIGHT} radius={Radius.card} />
        ) : calendar.status === 'error' ? (
          <ErrorState error={calendar.error} message="No pudimos cargar el calendario de este equipo." onRetry={calendar.reload} />
        ) : (
          <MonthCalendar key={listingId} marks={marks} onDayPress={(date, kind) => setDaySheet({ date, kind })} />
        )}

        {/* Leyenda compacta, en una sola línea. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.one }}>
          <LegendItem label="Reservado">
            <View style={{ width: Spacing.three, height: Spacing.three, borderRadius: Radius.full, backgroundColor: colors.primary }} />
          </LegendItem>
          <LegendItem label="Bloqueado">
            <View style={{ width: Spacing.three, height: Spacing.three, borderRadius: Radius.full, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.textMuted }} />
          </LegendItem>
          <LegendItem label="Hoy">
            <View style={{ width: Spacing.three, height: Spacing.three, borderRadius: Radius.full, borderWidth: 2, borderColor: colors.primary }} />
          </LegendItem>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Rhythm.cardGap }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="headline" accessibilityRole="header">
              Reservas de este equipo
            </Text>
            {pendingCount > 0 ? (
              <Text variant="caption" color="textSecondary">
                {pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'} de tu respuesta
              </Text>
            ) : null}
          </View>
          <Button label="Ver todas" variant="ghost" size="sm" fullWidth={false} onPress={() => router.push('/provider/bookings' as never)} style={{ marginRight: -Spacing.three }} />
        </View>

        {pendingFirst.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Este equipo todavía no tiene reservas"
            description="Cuando alguien reserve, aparecerá en el calendario y aquí."
            actionLabel="Ver reservas"
            onAction={() => router.push('/provider/bookings' as never)}
          />
        ) : (
          <View style={{ gap: Rhythm.cardGap }}>
            {pendingFirst.map((booking) => (
              <ProviderBookingCard
                key={booking.booking_id}
                booking={booking}
                onOpen={() => router.push({ pathname: '/provider/booking/[id]', params: { id: booking.booking_id } } as never)}
                onChanged={() => { base.reload(); calendar.reload(); }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Acción del día tocado: bloquear / liberar o ver la reserva. */}
      <Sheet visible={daySheet !== null} onClose={() => setDaySheet(null)}>
        {daySheet ? (
          <View style={{ gap: Spacing.three, paddingBottom: Spacing.two }}>
            <Text variant="headline" accessibilityRole="header" style={{ textTransform: 'capitalize' }}>
              {formatDayLong(daySheet.date)}
            </Text>

            {daySheet.kind === 'booked' ? (
              <>
                {sheetBooking ? (
                  <View style={{ gap: Spacing.one }}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {sheetBooking.listing_title ?? 'Equipo reservado'}
                    </Text>
                    <Text variant="body" color="textSecondary">
                      {sheetBooking.client_name ?? 'Cliente'} · {formatDateRange(sheetBooking.start_date, sheetBooking.end_date)}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {BOOKING_STATUS_LABELS[sheetBooking.status] ?? sheetBooking.status} · {formatPrice(sheetBooking.total_price)}
                    </Text>
                  </View>
                ) : (
                  <Text variant="body" color="textSecondary">
                    Este día está reservado.
                  </Text>
                )}
                {sheetBooking ? (
                  <Button
                    label="Ver reserva"
                    onPress={() => {
                      const id = sheetBooking.booking_id;
                      setDaySheet(null);
                      router.push({ pathname: '/provider/booking/[id]', params: { id } } as never);
                    }}
                  />
                ) : null}
              </>
            ) : daySheet.kind === 'blocked' ? (
              <>
                <Text variant="body" color="textSecondary">
                  Bloqueaste este día: nadie puede reservar el equipo. ¿Quieres liberarlo?
                </Text>
                <Button label="Liberar día" loading={toggling} onPress={() => toggleDay(daySheet.date)} />
              </>
            ) : (
              <>
                <Text variant="body" color="textSecondary">
                  Día libre. Bloquéalo si no vas a poder rentar el equipo (mantenimiento, uso propio).
                </Text>
                <Button label="Bloquear día" loading={toggling} onPress={() => toggleDay(daySheet.date)} />
              </>
            )}
            <Button label="Cerrar" variant="ghost" onPress={() => setDaySheet(null)} />
          </View>
        ) : null}
      </Sheet>

      {/* Selector de equipo: pantalla completa con zona segura por insets y buscador. */}
      <ModalScreen visible={showPicker} title="Elige un equipo" onClose={() => setShowPicker(false)}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: Spacing.three }}>
          <SearchBar value={pickerQuery} onChangeText={setPickerQuery} placeholder="Buscar equipo..." onClear={() => setPickerQuery('')} />
        </View>
        <FlatList
          data={filteredPickerListings}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: gutter, gap: Spacing.two, paddingBottom: Spacing.six }}
          ListEmptyComponent={<EmptyState icon="search-outline" title="Sin coincidencias" description={`No hay equipos que coincidan con "${pickerQuery}".`} />}
          renderItem={({ item }) => {
            const isSelected = item.id === listingId;
            return (
              <Pressable
                onPress={() => {
                  setSelectedListingId(item.id);
                  setShowPicker(false);
                  setPickerQuery('');
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.title ?? 'Equipo'}${isSelected ? ', seleccionado' : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Rhythm.cardPadding, borderRadius: Radius.card, backgroundColor: isSelected ? colors.primarySoft : colors.backgroundElement }}
              >
                <View style={{ width: Thumb.compact, height: Thumb.compact, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.imageBackdrop }}>
                  {item.cover_image_url ? <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : null}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.title ?? 'Equipo'}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {formatPrice(item.daily_price)}/día
                  </Text>
                </View>
                {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
        />
      </ModalScreen>
    </TabScreen>
  );
}
