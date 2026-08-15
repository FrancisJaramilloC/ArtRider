import { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getMyProviderProfile, getProviderBookings, type ProviderProfile, type ProviderBooking } from '@/services/providerService';
import { getMyListings, type MyListing } from '@/services/providerCatalogService';

const STATUS_MESSAGE: Record<ProviderProfile['status'], string> = {
  pending: 'Tu solicitud está siendo revisada. Te notificaremos cuando tu cuenta esté activa (1-3 días hábiles).',
  active: 'Tu cuenta de proveedor está activa. Ya puedes gestionar tu catálogo.',
  suspended: 'Tu cuenta de proveedor ha sido suspendida. Contacta a soporte para más información.',
};

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

function KpiCard({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundElement, borderRadius: Radius.lg, padding: Spacing.three }}>
      <Ionicons name={icon} size={18} color={colors.primary} style={{ marginBottom: Spacing.two }} />
      <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text }}>{value}</ThemedText>
      <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>{label}</ThemedText>
    </View>
  );
}

export function ProviderTodayScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const providerProfile = await getMyProviderProfile();
    setProfile(providerProfile);

    if (providerProfile?.status === 'active') {
      const [b, l] = await Promise.all([getProviderBookings(), getMyListings()]);
      setBookings(b);
      setListings(l);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          No tienes un perfil de proveedor todavía.
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (profile.status !== 'active') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: Spacing.four }}>
          <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text, marginBottom: Spacing.one }}>
            Hola, {profile.brand_name}
          </ThemedText>
          <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginBottom: Spacing.four }}>
            {STATUS_MESSAGE[profile.status]}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = bookings.filter((b) => b.status === 'AWAITING_SIGNATURES').length;
  const activeCount = bookings.filter((b) => b.status === 'ACTIVE' || b.status === 'PAID').length;
  const publishedCount = listings.filter((l) => l.is_published).length;

  const now = new Date();
  const thisMonthRevenue = bookings
    .filter((b) => {
      const d = new Date(b.created_at);
      return (
        (b.status === 'ACTIVE' || b.status === 'PAID' || b.status === 'COMPLETED') &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, b) => sum + b.total_price, 0);

  const recentBookings = bookings.slice(0, 5);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.four }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text, marginBottom: Spacing.one }}>
          Hola, {profile.brand_name}
        </ThemedText>
        <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary, marginBottom: Spacing.four }}>
          Así va tu negocio hoy.
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.three }}>
          <KpiCard icon="hourglass-outline" label="Pendientes" value={String(pendingCount)} colors={colors} />
          <KpiCard icon="checkmark-done-outline" label="Reservas activas" value={String(activeCount)} colors={colors} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.four }}>
          <KpiCard icon="cube-outline" label="Equipos publicados" value={`${publishedCount}/${listings.length}`} colors={colors} />
          <KpiCard icon="cash-outline" label="Ingresos este mes" value={`$${(thisMonthRevenue / 100).toFixed(0)}`} colors={colors} />
        </View>

        {pendingCount > 0 && (
          <Pressable
            onPress={() => router.push('/(provider)/calendar' as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.two,
              backgroundColor: `${colors.primary}15`,
              borderRadius: Radius.lg,
              padding: Spacing.three,
              marginBottom: Spacing.four,
            }}
          >
            <Ionicons name="alert-circle" size={18} color={colors.primary} />
            <ThemedText style={{ flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.text }}>
              Tienes {pendingCount} {pendingCount === 1 ? 'reserva pendiente' : 'reservas pendientes'} de tu respuesta
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>
        )}

        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.three }}>
          Reservas recientes
        </ThemedText>

        {recentBookings.length === 0 ? (
          <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary }}>
            Todavía no has recibido reservas.
          </ThemedText>
        ) : (
          <View style={{ gap: Spacing.two }}>
            {recentBookings.map((booking) => {
              const statusInfo = STATUS_CONFIG[booking.status];
              return (
                <View
                  key={booking.booking_id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: colors.backgroundElement, borderRadius: Radius.lg, padding: Spacing.three }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: Radius.md, overflow: 'hidden' }}>
                    {booking.listing_cover_image_url ? (
                      <Image source={{ uri: booking.listing_cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: colors.text }}>
                      {booking.listing_title ?? 'Item reservado'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary }}>
                      {booking.client_name ?? 'Cliente'} · {fmtDate(booking.start_date)}
                    </ThemedText>
                  </View>
                  <View style={{ backgroundColor: statusInfo.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 9.5, color: statusInfo.text }}>
                      {statusInfo.label}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}