import { useCallback, useState } from 'react';
import { View, FlatList, Image, Pressable, ActivityIndicator, useColorScheme, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getProviderBookings, respondToBooking, type ProviderBooking } from '@/services/providerService';

const STATUS_CONFIG: Record<ProviderBooking['status'], { label: string; bg: string; text: string }> = {
  AWAITING_SIGNATURES: { label: 'Pendiente', bg: '#fef3c7', text: '#92400e' },
  PAID: { label: 'Activa', bg: '#dcfce7', text: '#166534' },
  ACTIVE: { label: 'Activa', bg: '#dcfce7', text: '#166534' },
  COMPLETED: { label: 'Completada', bg: '#f3f4f6', text: '#4b5563' },
  DISPUTE: { label: 'En disputa', bg: '#fee2e2', text: '#991b1b' },
  CANCELLED: { label: 'Cancelada', bg: '#fee2e2', text: '#991b1b' },
  ARCHIVED: { label: 'Archivada', bg: '#f3f4f6', text: '#4b5563' },
};

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function BookingRow({ booking, onChanged }: { booking: ProviderBooking; onChanged: () => void }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [busy, setBusy] = useState(false);
  const statusInfo = STATUS_CONFIG[booking.status];

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
          <View style={{ alignSelf: 'flex-start', backgroundColor: statusInfo.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginBottom: 4 }}>
            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: statusInfo.text }}>{statusInfo.label}</ThemedText>
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
        <Pressable
          onPress={() => handleRespond('reject')}
          disabled={busy}
          style={{ marginTop: Spacing.three, alignSelf: 'flex-start' }}
        >
          <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.destructive }}>
            Cancelar reserva
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

export default function ProviderCalendarScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getProviderBookings().then(setBookings).finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const pending = bookings.filter((b) => b.status === 'AWAITING_SIGNATURES');
  const rest = bookings.filter((b) => b.status !== 'AWAITING_SIGNATURES');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: Spacing.four, paddingVertical: Spacing.three }}>
        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text }}>Calendario</ThemedText>
      </View>

      {bookings.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five }}>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Todavía no has recibido reservas.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={[...pending, ...rest]}
          keyExtractor={(b) => b.booking_id}
          contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}
          ListHeaderComponent={
            pending.length > 0 ? (
              <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.textSecondary, marginBottom: Spacing.two }}>
                {pending.length} {pending.length === 1 ? 'reserva pendiente' : 'reservas pendientes'} de tu respuesta
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => <BookingRow booking={item} onChanged={load} />}
        />
      )}
    </SafeAreaView>
  );
}