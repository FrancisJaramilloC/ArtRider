import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Image, Pressable, TextInput, Modal, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, StatusColors, BOOKING_STATUS_LABELS, toStatusKey } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function BookingRow({ booking, onChanged }: { booking: ProviderBooking; onChanged: () => void }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [busy, setBusy] = useState(false);
  const statusColors = StatusColors[scheme === 'dark' ? 'dark' : 'light'][toStatusKey(booking.status)];
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const [showFinalize, setShowFinalize] = useState(false);

  async function handleRespond(action: 'accept' | 'reject') {
    if (action === 'reject') {
      Alert.alert(
        'Rechazar reserva',
        'Esto reembolsará automáticamente al cliente si ya se cobró. Esta acción no se puede deshacer.',
        [
          { text: 'Volver', style: 'cancel' },
          { text: 'Rechazar', style: 'destructive', onPress: () => run('reject') },
        ]
      );
      return;
    }
    run('accept');
  }

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
    <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.lg, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <View style={{ width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden' }}>
          {booking.listing_cover_image_url ? (
            <Image source={{ uri: booking.listing_cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: statusColors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginBottom: 4 }}>
            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: statusColors.fg }}>{statusLabel}</ThemedText>
          </View>
          <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
            {booking.listing_title ?? 'Item reservado'}
          </ThemedText>
          <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            {fmtDate(booking.start_date)} - {fmtDate(booking.end_date)} · ${(booking.total_price / 100).toFixed(2)}
          </ThemedText>
          {booking.client_name && (
            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              Cliente: {booking.client_name}
            </ThemedText>
          )}
        </View>
      </View>

      {booking.client_phone && (
        <Pressable
          onPress={() => Linking.openURL(`tel:${booking.client_phone}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two }}
        >
          <Ionicons name="call-outline" size={14} color={colors.primary} />
          <ThemedText style={{ fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>
            {booking.client_phone}
          </ThemedText>
        </Pressable>
      )}

      {booking.status === 'AWAITING_SIGNATURES' && (
        <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three }}>
          <Pressable
            onPress={() => handleRespond('reject')}
            disabled={busy}
            style={{ flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.destructive, alignItems: 'center' }}
          >
            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.destructive }}>Rechazar</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleRespond('accept')}
            disabled={busy}
            style={{ flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.md, backgroundColor: colors.primary, alignItems: 'center' }}
          >
            {busy ? <ActivityIndicator size="small" color="#fff" /> : (
              <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' }}>Aceptar</ThemedText>
            )}
          </Pressable>
        </View>
      )}

      {booking.status === 'ACTIVE' && (
        <View style={{ flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.three }}>
          <Pressable onPress={() => handleRespond('reject')} disabled={busy}>
            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.destructive }}>
              Cancelar reserva
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => setShowFinalize(true)} disabled={busy}>
            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primary }}>
              Finalizar reserva
            </ThemedText>
          </Pressable>
        </View>
      )}

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
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const markedDates: Record<string, any> = {};
  marks.forEach((m) => {
    markedDates[m.date] = {
      selected: true,
      selectedColor: m.mark === 'booked' ? '#ef4444' : colors.textMuted,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: Spacing.four, paddingVertical: Spacing.three }}>
        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text }}>Calendario</ThemedText>
      </View>

      {myListings.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five }}>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Publica al menos un equipo para gestionar su calendario.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={[...pending, ...rest]}
          keyExtractor={(b) => b.booking_id}
          contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}
          ListHeaderComponent={
            <View style={{ marginBottom: Spacing.four }}>
              {/* Selector de equipo — botón que abre un buscador, escala a cientos de items */}
              <Pressable
                onPress={() => setShowPicker(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  backgroundColor: colors.backgroundElement,
                  borderRadius: Radius.lg,
                  padding: Spacing.three,
                  marginBottom: Spacing.three,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: Radius.md, overflow: 'hidden' }}>
                  {selectedListing?.cover_image_url ? (
                    <Image source={{ uri: selectedListing.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>Equipo seleccionado</ThemedText>
                  <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>
                    {selectedListing?.title ?? 'Elige un equipo'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </Pressable>

              {loadingCalendar ? (
                <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <Calendar
                  key={selectedListingId}
                  markedDates={markedDates}
                  onDayPress={(day: { dateString: string }) => handleDayPress(day.dateString)}
                  minDate={new Date().toISOString().split('T')[0]}
                  theme={{
                    backgroundColor: colors.background,
                    calendarBackground: colors.background,
                    textSectionTitleColor: colors.textSecondary,
                    dayTextColor: colors.text,
                    monthTextColor: colors.text,
                    arrowColor: colors.primary,
                    todayTextColor: colors.primary,
                  }}
                  style={{ borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.backgroundElement }}
                />
              )}

              <View style={{ flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.three, paddingHorizontal: Spacing.one }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} />
                  <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Reservado</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textMuted }} />
                  <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Bloqueado por ti</ThemedText>
                </View>
              </View>
              <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: Spacing.two }}>
                Toca un día libre para bloquearlo (mantenimiento, uso propio) o un día bloqueado para liberarlo.
              </ThemedText>

              {pending.length > 0 && (
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.textSecondary, marginTop: Spacing.five, marginBottom: Spacing.two }}>
                  {pending.length} {pending.length === 1 ? 'reserva pendiente' : 'reservas pendientes'} de tu respuesta
                </ThemedText>
              )}
            </View>
          }
          ListEmptyComponent={
            <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.four }}>
              Este equipo todavía no tiene reservas.
            </ThemedText>
          }
          renderItem={({ item }) => <BookingRow booking={item} onChanged={load} />}
        />
      )}

      {/* Modal buscador de equipo */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four }}>
            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text }}>Elige un equipo</ThemedText>
            <Pressable onPress={() => setShowPicker(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.three }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.two,
                backgroundColor: colors.backgroundElement,
                borderRadius: 999,
                paddingHorizontal: Spacing.three,
              }}
            >
              <Ionicons name="search" size={17} color={colors.textSecondary} />
              <TextInput
                value={pickerQuery}
                onChangeText={setPickerQuery}
                placeholder="Buscar equipo..."
                placeholderTextColor={colors.textSecondary}
                autoFocus
                style={{ flex: 1, paddingVertical: 12, fontSize: 14.5, fontFamily: 'Inter_400Regular', color: colors.text }}
              />
              {pickerQuery.length > 0 && (
                <Pressable onPress={() => setPickerQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
          <FlatList
            data={filteredPickerListings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six }}
            ListEmptyComponent={
              <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.five }}>
                No hay equipos que coincidan con "{pickerQuery}".
              </ThemedText>
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
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.three,
                    padding: Spacing.three,
                    borderRadius: Radius.lg,
                    backgroundColor: isSelected ? `${colors.primary}15` : colors.backgroundElement,
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: Radius.md, overflow: 'hidden' }}>
                    {item.cover_image_url ? (
                      <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: colors.text }}>
                      {item.title ?? 'Equipo'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                      ${(item.daily_price / 100).toFixed(0)}/día
                    </ThemedText>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}