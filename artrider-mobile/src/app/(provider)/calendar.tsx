import { ROLE_CLIENT } from '@/constants/copy';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ItemPickerSheet, type PickerItem } from '@/components/provider/ItemPickerSheet';
import { MonthCalendar } from '@/components/provider/MonthCalendar';
import { ProviderBookingCard } from '@/components/provider/ProviderBookingCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { ScreenSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { TabScreen } from '@/components/ui/TabScreen';
import { Text } from '@/components/ui/Text';
import { BOOKING_STATUS_LABELS, MinTouch, Radius, Rhythm, Spacing, Thumb } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getMyListings, type MyListing } from '@/services/providerCatalogService';
import { getListingCalendar, getProviderBookings, toggleBlockDate, type CalendarMark, type ProviderBooking } from '@/services/providerService';
import { formatDayLong } from '@/utils/calendar';
import { formatPrice } from '@/utils/format';
import { bookingsByDay, formatDateRange, upcomingBookings, upcomingCountByListing } from '@/utils/providerBookings';
import { loadSetting, saveSetting } from '@/utils/recentPicks';

type CalendarBundle = { bookings: ProviderBooking[]; listings: MyListing[] };
type DaySheet = { date: string; kind: 'free' | 'blocked' | 'booked' };

/** Alto reservado al calendario mientras carga (6 semanas × 44 + cabecera). */
const CALENDAR_PLACEHOLDER_HEIGHT = 360;
/** Cuántas reservas se listan bajo el calendario en «Todos los equipos». */
const UPCOMING_SHOWN = 5;
/** Clave del ajuste «equipo fijado»: por defecto el calendario siempre abre en «Todos». */
const PINNED_SETTING = 'calendar.pinned';

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

  // null = «Todos los equipos» (agenda agregada).
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [pinnedLoaded, setPinnedLoaded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
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

  // Solo si el Partner fijó un equipo, se abre en él; si ya no existe, se ignora.
  useEffect(() => {
    let cancelled = false;
    loadSetting(PINNED_SETTING).then((id) => {
      if (cancelled) return;
      setPinnedId(id);
      setPinnedLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (pinnedLoaded && pinnedId && base.data && myListings.some((l) => l.id === pinnedId)) {
      setSelectedListingId((current) => current ?? pinnedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedLoaded, base.data !== null]);

  const listingId = selectedListingId;
  const isAll = listingId === null;

  const calendar = useAsyncData<CalendarMark[]>(() => getListingCalendar(listingId as string), { enabled: !!listingId, deps: [listingId] });
  const marks = calendar.data ?? [];

  const selectedListing = myListings.find((l) => l.id === listingId) ?? null;
  const bookingsForListing = allBookings.filter((b) => b.listing_id === listingId);
  const pendingFirst = [...bookingsForListing].sort((a, b) => Number(b.status === 'AWAITING_SIGNATURES') - Number(a.status === 'AWAITING_SIGNATURES'));
  const pendingCount = bookingsForListing.filter((b) => b.status === 'AWAITING_SIGNATURES').length;

  // Agenda de todos los equipos: reservas por día y próximas (sin consultas nuevas).
  const byDay = useMemo(() => bookingsByDay(allBookings), [allBookings]);
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    byDay.forEach((list, date) => {
      out[date] = list.length;
    });
    return out;
  }, [byDay]);
  const upcoming = useMemo(() => upcomingBookings(allBookings), [allBookings]);

  const pickerItems: PickerItem[] = useMemo(() => {
    const upcomingByListing = upcomingCountByListing(allBookings);
    return myListings.map((l) => ({
      id: l.id,
      title: l.title,
      brand: l.brand,
      model: l.model,
      category: l.category,
      cover_image_url: l.cover_image_url,
      daily_price: l.daily_price,
      is_published: l.is_published,
      upcoming: upcomingByListing[l.id] ?? 0,
    }));
  }, [myListings, allBookings]);

  function bookingOn(date: string): ProviderBooking | null {
    return (
      bookingsForListing.find(
        (b) => b.status !== 'CANCELLED' && b.status !== 'ARCHIVED' && b.start_date.slice(0, 10) <= date && date <= b.end_date.slice(0, 10),
      ) ?? null
    );
  }

  function togglePin() {
    if (!listingId) return;
    const next = pinnedId === listingId ? null : listingId;
    setPinnedId(next);
    saveSetting(PINNED_SETTING, next);
  }

  function openBooking(id: string) {
    setDaySheet(null);
    router.push({ pathname: '/provider/booking/[id]', params: { id } } as never);
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

  const sheetBooking = daySheet?.kind === 'booked' && !isAll ? bookingOn(daySheet.date) : null;
  const daySheetBookings = daySheet && isAll ? (byDay.get(daySheet.date) ?? []) : [];

  return (
    <TabScreen title="Calendario">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={base.refreshing} onRefresh={async () => { await Promise.all([base.refresh(), isAll ? Promise.resolve() : calendar.reload()]); }} tintColor={colors.primary} />}
        // El último bloque (y el texto del estado vacío) queda por encima de la barra de pestañas flotante.
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Spacing.two, paddingBottom: bottomInset + Rhythm.chipsToSection, gap: Rhythm.titleToContent, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
      >
        {base.refreshError ? <RefreshErrorNotice error={base.refreshError} onRetry={base.reload} /> : null}

        {/* Chip de equipo: «Todos los equipos ▾» por defecto; elegir uno muestra su calendario y «×» vuelve a Todos. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: MinTouch,
              backgroundColor: isAll ? colors.backgroundElement : colors.primarySoft,
              borderRadius: Radius.full,
              borderWidth: 1.5,
              borderColor: isAll ? 'transparent' : colors.primary,
            }}
          >
            <Pressable
              onPress={() => setShowPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={isAll ? 'Todos los equipos. Elegir un equipo' : `Equipo: ${selectedListing?.title ?? ''}. Cambiar`}
              style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingLeft: Spacing.three, minHeight: MinTouch, opacity: pressed ? 0.85 : 1 })}
            >
              {isAll ? (
                <Ionicons name="albums-outline" size={18} color={colors.textSecondary} />
              ) : (
                <View style={{ width: Spacing.five, height: Spacing.five, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: colors.imageBackdrop }}>
                  {selectedListing?.cover_image_url ? <Image source={{ uri: selectedListing.cover_image_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" /> : null}
                </View>
              )}
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {isAll ? 'Todos los equipos' : (selectedListing?.title ?? 'Equipo')}
              </Text>
              {isAll ? <Ionicons name="chevron-down" size={16} color={colors.textMuted} /> : null}
            </Pressable>
            {!isAll ? (
              <Pressable onPress={() => setSelectedListingId(null)} accessibilityRole="button" accessibilityLabel="Quitar el equipo y ver todos" style={{ width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
          {!isAll ? (
            <IconButton
              icon={pinnedId === listingId ? 'pin' : 'pin-outline'}
              label={pinnedId === listingId ? 'Quitar equipo fijado' : 'Fijar este equipo: el calendario abrirá siempre en él'}
              variant="outline"
              onPress={togglePin}
            />
          ) : null}
        </View>

        {isAll ? (
          <MonthCalendar key="all" marks={[]} counts={counts} onDayPress={(date, kind) => kind === 'booked' && setDaySheet({ date, kind })} />
        ) : calendar.status === 'loading' ? (
          <Skeleton height={CALENDAR_PLACEHOLDER_HEIGHT} radius={Radius.card} />
        ) : calendar.status === 'error' ? (
          <ErrorState error={calendar.error} message="No pudimos cargar el calendario de este equipo." onRetry={calendar.reload} />
        ) : (
          <MonthCalendar key={listingId} marks={marks} onDayPress={(date, kind) => setDaySheet({ date, kind })} />
        )}

        {/* Leyenda compacta, en una sola línea. */}
        {isAll ? (
          <Text variant="caption" color="textSecondary">
            El número indica cuántas reservas caen ese día. Toca un día para verlas.
          </Text>
        ) : (
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
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Rhythm.cardGap }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="headline" accessibilityRole="header">
              {isAll ? 'Próximas reservas' : 'Reservas de este equipo'}
            </Text>
            {!isAll && pendingCount > 0 ? (
              <Text variant="caption" color="textSecondary">
                {pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'} de tu respuesta
              </Text>
            ) : null}
          </View>
          <Button label="Ver todas" variant="ghost" size="sm" fullWidth={false} onPress={() => router.push('/provider/bookings' as never)} style={{ marginRight: -Spacing.three }} />
        </View>

        {(isAll ? upcoming.length === 0 : pendingFirst.length === 0) ? (
          <EmptyState
            icon="calendar-outline"
            title={isAll ? 'Aún no tienes reservas próximas' : 'Este equipo todavía no tiene reservas'}
            description="Cuando alguien reserve, aparecerá en el calendario y aquí."
            actionLabel="Ver reservas"
            onAction={() => router.push('/provider/bookings' as never)}
          />
        ) : (
          <View style={{ gap: Rhythm.cardGap }}>
            {(isAll ? upcoming.slice(0, UPCOMING_SHOWN) : pendingFirst).map((booking) => (
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

      {/* Día tocado: en «Todos» lista sus reservas; en un equipo, bloquear / liberar o ver la reserva. */}
      <Sheet visible={daySheet !== null} onClose={() => setDaySheet(null)}>
        {daySheet ? (
          <View style={{ gap: Spacing.three, paddingBottom: Spacing.two }}>
            <Text variant="headline" accessibilityRole="header" style={{ textTransform: 'capitalize' }}>
              {formatDayLong(daySheet.date)}
            </Text>

            {isAll ? (
              <View style={{ gap: Spacing.two }}>
                {daySheetBookings.map((b) => (
                  <Pressable
                    key={b.booking_id}
                    onPress={() => openBooking(b.booking_id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.listing_title ?? 'Equipo'}, ${b.client_name ?? ROLE_CLIENT}, ${formatDateRange(b.start_date, b.end_date)}`}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: Thumb.compact + Spacing.three, opacity: pressed ? 0.8 : 1 })}
                  >
                    <View style={{ width: Thumb.compact, height: Thumb.compact, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.imageBackdrop }}>
                      {b.listing_cover_image_url ? <Image source={{ uri: b.listing_cover_image_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : null}
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
                      <Text variant="bodyStrong" numberOfLines={2}>
                        {b.listing_title ?? 'Equipo reservado'}
                      </Text>
                      <Text variant="caption" color="textSecondary" numberOfLines={1}>
                        {b.client_name ?? ROLE_CLIENT} · {formatDateRange(b.start_date, b.end_date)}
                      </Text>
                      <View style={{ alignSelf: 'flex-start' }}>
                        <Badge label={BOOKING_STATUS_LABELS[b.status] ?? b.status} tone={b.status === 'AWAITING_SIGNATURES' ? 'warning' : 'neutral'} />
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            ) : daySheet.kind === 'booked' ? (
              <>
                {sheetBooking ? (
                  <View style={{ gap: Spacing.one }}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {sheetBooking.listing_title ?? 'Equipo reservado'}
                    </Text>
                    <Text variant="body" color="textSecondary">
                      {sheetBooking.client_name ?? ROLE_CLIENT} · {formatDateRange(sheetBooking.start_date, sheetBooking.end_date)}
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
                {sheetBooking ? <Button label="Ver reserva" onPress={() => openBooking(sheetBooking.booking_id)} /> : null}
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

      {/* Selector de equipo: pantalla completa con buscador, filtros, recientes y A–Z (aguanta miles). */}
      <ItemPickerSheet
        visible={showPicker}
        title="Elige un equipo"
        onClose={() => setShowPicker(false)}
        items={pickerItems}
        mode="single"
        selected={listingId ? { [listingId]: 1 } : {}}
        onPick={(id) => {
          setSelectedListingId(id);
          setShowPicker(false);
        }}
        recentsScope="calendar-listings"
      />
    </TabScreen>
  );
}
