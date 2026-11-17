import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Pressable, Linking, Alert, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Calendar } from 'react-native-calendars';

type CalendarTheme = NonNullable<ComponentProps<typeof Calendar>['theme']>;
type CalendarMarking = NonNullable<ComponentProps<typeof Calendar>['markedDates']>[string];

import { ModalScreen } from '@/components/ui/ModalScreen';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useLayout } from '@/hooks/use-layout';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Skeleton, ScreenSkeleton } from '@/components/ui/Skeleton';
import { TabScreen } from '@/components/ui/TabScreen';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate } from '@/utils/format';
import { Spacing, Radius, Rhythm, MinTouch, Thumb, BOOKING_STATUS_LABELS, toStatusKey, type BookingStatusKey } from '@/constants/theme';

const CALENDAR_PLACEHOLDER_HEIGHT = 320;

const STATUS_TONE: Record<BookingStatusKey, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
  completed: 'neutral',
};
import {
  getProviderBookings,
  respondToBooking,
  finalizeBooking,
  getListingCalendar,
  toggleBlockDate,
  type ProviderBooking,
  type CalendarMark,
} from '@/services/providerService';
import { getMyListings, type MyListing } from '@/services/providerCatalogService';
import { ReviewModal } from '@/components/reviews/ReviewModal';

function BookingRow({ booking, onChanged }: { booking: ProviderBooking; onChanged: () => void }) {
  const colors = useTheme();
  const [busy, setBusy] = useState(false);
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const [showFinalize, setShowFinalize] = useState(false);
  const [showReject, setShowReject] = useState(false);

  async function handleFinalize(rating: number, comment: string) {
    const result = await finalizeBooking(booking.booking_id, rating, comment);
    if (result.error) {
      setShowFinalize(false);
      Alert.alert('No se pudo completar', result.error);
      return;
    }
    setShowFinalize(false);
    onChanged();
  }

  async function run(action: 'accept' | 'reject') {
    setBusy(true);
    const result = await respondToBooking(booking.booking_id, action);
    setBusy(false);
    if (result.error) {
      Alert.alert('No se pudo completar', result.error);
      return;
    }
    onChanged();
  }

  return (
    <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding, gap: Rhythm.cardPadding }}>
      <View style={{ flexDirection: 'row', gap: Rhythm.cardPadding }}>
        <View style={{ width: Thumb.list, height: Thumb.list, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
          {booking.listing_cover_image_url ? (
            <Image source={{ uri: booking.listing_cover_image_url }} style={{ width: Thumb.list, height: Thumb.list }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={22} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
          <Badge label={statusLabel} tone={STATUS_TONE[toStatusKey(booking.status)]} />
          <Text variant="bodyStrong" numberOfLines={2} style={{ marginTop: Spacing.one }}>
            {booking.listing_title ?? 'Item reservado'}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {formatShortDate(booking.start_date)} - {formatShortDate(booking.end_date)} · ${(booking.total_price / 100).toFixed(2)}
          </Text>
          {booking.client_name ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              Cliente: {booking.client_name}
            </Text>
          ) : null}
        </View>
      </View>

      {booking.client_phone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${booking.client_phone}`)}
          accessibilityRole="link"
          accessibilityLabel={`Llamar al cliente ${booking.client_phone}`}
          style={{ minHeight: MinTouch, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}
        >
          <Ionicons name="call-outline" size={16} color={colors.primary} />
          <Text variant="captionStrong" color="primary">
            {booking.client_phone}
          </Text>
        </Pressable>
      ) : null}

      {booking.status === 'AWAITING_SIGNATURES' && (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button label="Rechazar" variant="destructive" size="sm" fullWidth disabled={busy} onPress={() => setShowReject(true)} style={{ flex: 1 }} />
          <Button label="Aceptar" size="sm" fullWidth loading={busy} onPress={() => run('accept')} style={{ flex: 1 }} />
        </View>
      )}

      {booking.status === 'ACTIVE' && (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button label="Cancelar reserva" variant="destructive" size="sm" fullWidth disabled={busy} onPress={() => setShowReject(true)} style={{ flex: 1 }} />
          <Button label="Finalizar reserva" variant="tonal" size="sm" fullWidth disabled={busy} onPress={() => setShowFinalize(true)} style={{ flex: 1 }} />
        </View>
      )}

      <ConfirmSheet
        visible={showReject}
        title={booking.status === 'ACTIVE' ? 'Cancelar reserva' : 'Rechazar reserva'}
        message="Esto reembolsará automáticamente al cliente si ya se cobró. Esta acción no se puede deshacer."
        confirmLabel={booking.status === 'ACTIVE' ? 'Sí, cancelar' : 'Rechazar'}
        destructive
        loading={busy}
        onCancel={() => setShowReject(false)}
        onConfirm={() => {
          // Cierra la hoja primero: así un posible aviso de error no choca con su cierre.
          setShowReject(false);
          run('reject');
        }}
      />

      <ReviewModal
        visible={showFinalize}
        title="Finalizar y calificar"
        subtitle={`¿Cómo fue tu experiencia con ${booking.client_name ?? 'este cliente'}?`}
        onCancel={() => setShowFinalize(false)}
        onSubmit={handleFinalize}
        submitLabel="Finalizar reserva"
        allowSkip
        onSkip={async () => {
          const result = await finalizeBooking(booking.booking_id);
          setShowFinalize(false);
          if (result.error) {
            Alert.alert('No se pudo completar', result.error);
            return;
          }
          onChanged();
        }}
      />
    </View>
  );
}

export default function ProviderCalendarScreen() {
  const { gutter, bottomInset } = useLayout();
  const colors = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [marks, setMarks] = useState<CalendarMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const load = useCallback(async () => {
    const [b, listings] = await Promise.all([getProviderBookings(), getMyListings()]);
    setBookings(b);
    setMyListings(listings);
    setSelectedListingId((prev) => prev ?? listings[0]?.id ?? null);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => {
    if (!selectedListingId) return;
    setLoadingCalendar(true);
    getListingCalendar(selectedListingId)
      .then(setMarks)
      .finally(() => setLoadingCalendar(false));
  }, [selectedListingId]);

  async function handleDayPress(dateStr: string) {
    if (!selectedListingId) return;
    const existing = marks.find((m) => m.date === dateStr);
    if (existing?.mark === 'booked') return;

    const result = await toggleBlockDate(selectedListingId, dateStr);
    if (result.error) {
      Alert.alert('No se pudo bloquear', result.error);
      return;
    }
    if (result.mark === 'blocked') {
      setMarks((prev) => [...prev, { date: dateStr, mark: 'blocked' }]);
    } else {
      setMarks((prev) => prev.filter((m) => m.date !== dateStr));
    }
  }

  if (loading) {
    return (
      <TabScreen title="Calendario">
        <ScreenSkeleton />
      </TabScreen>
    );
  }

  const calendarTheme = {
    backgroundColor: colors.background,
    calendarBackground: colors.backgroundElement,
    textSectionTitleColor: colors.textSecondary,
    dayTextColor: colors.text,
    monthTextColor: colors.text,
    arrowColor: colors.primary,
    todayTextColor: colors.primary,
    textDisabledColor: colors.textMuted,
    textDayFontFamily: 'Inter_500Medium',
    textMonthFontFamily: 'Inter_700Bold',
    // Celdas de día de 44×44 (objetivo táctil mínimo); por defecto miden 32.
    'stylesheet.day.basic': { base: { width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center' } },
  } as CalendarTheme;

  // Marcas distinguibles SIN depender solo del color: reservado = relleno sólido y número en negrita;
  // bloqueado = contorno discontinuo y número tachado.
  const markedDates: Record<string, CalendarMarking> = {};
  marks.forEach((m) => {
    markedDates[m.date] =
      m.mark === 'booked'
        ? {
            customStyles: {
              container: { backgroundColor: colors.destructive, borderRadius: Radius.full },
              text: { color: colors.onPrimary, fontFamily: 'Inter_700Bold' },
            },
          }
        : {
            customStyles: {
              container: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.textMuted, borderRadius: Radius.full },
              text: { color: colors.textMuted, textDecorationLine: 'line-through' },
            },
          };
  });

  const selectedListing = myListings.find((l) => l.id === selectedListingId) ?? null;
  const bookingsForListing = selectedListingId
    ? bookings.filter((b) => b.listing_id === selectedListingId)
    : bookings;
  const pending = bookingsForListing.filter((b) => b.status === 'AWAITING_SIGNATURES');
  const rest = bookingsForListing.filter((b) => b.status !== 'AWAITING_SIGNATURES');

  const filteredPickerListings = pickerQuery.trim()
    ? myListings.filter((l) => (l.title ?? '').toLowerCase().includes(pickerQuery.trim().toLowerCase()))
    : myListings;

  return (
    <TabScreen title="Calendario">
      {myListings.length === 0 ? (
        <EmptyState
          fill
          icon="calendar-outline"
          title="Aún no hay calendario"
          description="Publica al menos un equipo para gestionar su calendario."
          actionLabel="Publicar mi primer equipo"
          onAction={() => router.push('/provider/new-listing' as never)}
        />
      ) : (
        <FlatList
          data={[...pending, ...rest]}
          keyExtractor={(b) => b.booking_id}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Spacing.two, paddingBottom: bottomInset + Spacing.four, gap: Rhythm.cardGap }}
          ListHeaderComponent={
            <View style={{ gap: Rhythm.titleToContent, marginBottom: Rhythm.section - Rhythm.cardGap }}>
              {/* Selector de equipo — botón que abre un buscador, escala a cientos de items */}
              <Pressable
                onPress={() => setShowPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={`Equipo seleccionado: ${selectedListing?.title ?? 'ninguno'}. Cambiar`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.three,
                    backgroundColor: colors.backgroundElement,
                    borderRadius: Radius.card,
                    padding: Rhythm.cardPadding,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={{ width: Thumb.compact, height: Thumb.compact, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
                  {selectedListing?.cover_image_url ? (
                    <Image source={{ uri: selectedListing.cover_image_url }} style={{ width: Thumb.compact, height: Thumb.compact }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
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

              {loadingCalendar ? (
                <Skeleton height={CALENDAR_PLACEHOLDER_HEIGHT} radius={Radius.card} />
              ) : (
                <Calendar
                  key={selectedListingId}
                  markingType="custom"
                  markedDates={markedDates}
                  onDayPress={(day: { dateString: string }) => handleDayPress(day.dateString)}
                  minDate={new Date().toISOString().split('T')[0]}
                  theme={calendarTheme}
                  style={{ borderRadius: Radius.card, overflow: 'hidden', backgroundColor: colors.backgroundElement }}
                />
              )}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <View style={{ width: Spacing.three, height: Spacing.three, borderRadius: Radius.full, backgroundColor: colors.destructive }} />
                  <Text variant="caption" color="textSecondary">
                    Reservado
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <View style={{ width: Spacing.three, height: Spacing.three, borderRadius: Radius.full, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.textMuted }} />
                  <Text variant="caption" color="textSecondary">
                    Bloqueado por ti
                  </Text>
                </View>
              </View>
              <Text variant="caption" color="textSecondary">
                Toca un día libre para bloquearlo (mantenimiento, uso propio) o un día bloqueado para liberarlo.
              </Text>

              {pending.length > 0 && (
                <Text variant="captionStrong" color="textSecondary" style={{ marginTop: Spacing.three }}>
                  {pending.length} {pending.length === 1 ? 'reserva pendiente' : 'reservas pendientes'} de tu respuesta
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyState icon="calendar-outline" title="Sin reservas" description="Este equipo todavía no tiene reservas." />
          }
          renderItem={({ item }) => <BookingRow booking={item} onChanged={load} />}
        />
      )}

      {/* Modal buscador de equipo */}
      {/* Selector de equipo: modal a pantalla completa con zona segura por insets */}
      <ModalScreen visible={showPicker} title="Elige un equipo" onClose={() => setShowPicker(false)}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: Spacing.three }}>
          <SearchBar value={pickerQuery} onChangeText={setPickerQuery} placeholder="Buscar equipo..." onClear={() => setPickerQuery('')} />
        </View>
        <FlatList
          data={filteredPickerListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: gutter, gap: Spacing.two, paddingBottom: Spacing.six }}
          ListEmptyComponent={
            <EmptyState icon="search-outline" title="Sin coincidencias" description={`No hay equipos que coincidan con "${pickerQuery}".`} />
          }
          renderItem={({ item }) => {
            const isSelected = item.id === selectedListingId;
            return (
              <Pressable
                onPress={() => {
                  setSelectedListingId(item.id);
                  setShowPicker(false);
                  setPickerQuery('');
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.title ?? 'Equipo'}${isSelected ? ', seleccionado' : ''}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  padding: Rhythm.cardPadding,
                  borderRadius: Radius.card,
                  backgroundColor: isSelected ? colors.primarySoft : colors.backgroundElement,
                }}
              >
                <View style={{ width: Thumb.compact, height: Thumb.compact, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
                  {item.cover_image_url ? (
                    <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : null}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.title ?? 'Equipo'}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    ${(item.daily_price / 100).toFixed(0)}/día
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      </ModalScreen>
    </TabScreen>
  );
}