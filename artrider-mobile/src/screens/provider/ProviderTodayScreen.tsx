import { COPY, ROLE_CLIENT } from '@/constants/copy';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ScreenSkeleton } from '@/components/ui/Skeleton';
import { TabScreen } from '@/components/ui/TabScreen';
import { Text } from '@/components/ui/Text';
import { BOOKING_STATUS_LABELS, Radius, Rhythm, Spacing, Thumb, toStatusKey, type BookingStatusKey } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getMyProviderProfile, getProviderBookings, type ProviderProfile, type ProviderBooking } from '@/services/providerService';
import { getMyListings, type MyListing } from '@/services/providerCatalogService';
import { earningsLabel, summarize, toEarningRows } from '@/utils/earnings';
import { formatPrice, formatShortDate } from '@/utils/format';
import { formatDateRange, nextAcceptedBooking } from '@/utils/providerBookings';

type HomeBundle = { profile: ProviderProfile | null; bookings: ProviderBooking[]; listings: MyListing[] };

const STATUS_MESSAGE: Record<ProviderProfile['status'], string> = {
  pending: 'Tu solicitud está siendo revisada. Te notificaremos cuando tu cuenta esté activa (1-3 días hábiles).',
  active: COPY.providerAccountActive,
  suspended: COPY.providerAccountSuspended,
};

const STATUS_TONE: Record<BookingStatusKey, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
  completed: 'neutral',
};

/** Tarjeta de métrica: ícono, número grande y etiqueta; ancho y alto iguales en la cuadrícula. Con `onPress` es un botón. */
function KpiCard({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={onPress ? 'Abre el detalle' : undefined}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding + Spacing.one, gap: Spacing.two, opacity: pressed && onPress ? 0.85 : 1 })}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ProviderTodayScreen() {
  const { gutter, bottomInset } = useLayout();
  const colors = useTheme();
  const router = useRouter();

  const { status, data: bundle, error, refreshError, refreshing, reload, refresh } = useAsyncData<HomeBundle>(
    async () => {
      const profile = await getMyProviderProfile();
      if (profile?.status !== 'active') return { profile, bookings: [], listings: [] };
      const [bookings, listings] = await Promise.all([getProviderBookings(), getMyListings()]);
      return { profile, bookings, listings };
    },
    { reloadOnFocus: true },
  );
  const profile = bundle?.profile ?? null;
  const bookings = bundle?.bookings ?? [];
  const listings = bundle?.listings ?? [];
  const onRefresh = refresh;

  if (status === 'loading') {
    return (
      <TabScreen title="Home">
        <ScreenSkeleton />
      </TabScreen>
    );
  }

  if (status === 'error') {
    return (
      <TabScreen title="Home">
        <ErrorState fill error={error} onRetry={reload} />
      </TabScreen>
    );
  }

  if (!profile) {
    return (
      <TabScreen title="Home">
        <EmptyState
          fill
          icon="storefront-outline"
          title={COPY.notProviderYetTitle}
          description={COPY.notProviderYetBody}
          actionLabel={COPY.becomeProviderAction}
          onAction={() => router.push('/become-provider' as never)}
        />
      </TabScreen>
    );
  }

  if (profile.status !== 'active') {
    return (
      <TabScreen title="Home">
        <View style={{ paddingHorizontal: gutter, gap: Spacing.two }}>
          <Text variant="headline">Hola, {profile.brand_name}</Text>
          <Text variant="body" color="textSecondary">
            {STATUS_MESSAGE[profile.status]}
          </Text>
        </View>
      </TabScreen>
    );
  }

  const pendingCount = bookings.filter((b) => b.status === 'AWAITING_SIGNATURES').length;
  const activeCount = bookings.filter((b) => b.status === 'ACTIVE' || b.status === 'PAID').length;
  const publishedCount = listings.filter((l) => l.is_published).length;

  // Mismo cálculo que la pantalla «Ganancias»: todo en lo que gana el Partner (partner_amount).
  const earnings = summarize(toEarningRows(bookings));

  const recentBookings = bookings.slice(0, 5);
  // La aceptada más cercana (hoy medido en Ecuador). Solo datos reales de la reserva y lo que GANA el Partner.
  const nextBooking = nextAcceptedBooking(bookings);

  return (
    <TabScreen title="Home">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: bottomInset + Spacing.four, gap: Rhythm.section }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {refreshError ? <RefreshErrorNotice error={refreshError} onRetry={reload} /> : null}

        <View style={{ gap: Rhythm.titleToContent }}>
          <Text variant="headline" numberOfLines={2}>
            Hola, {profile.brand_name}
          </Text>
          <Text variant="body" color="textSecondary">
            Así va tu negocio hoy.
          </Text>
        </View>

        {/* Cuadrícula simétrica: 2 columnas de igual ancho y alto. */}
        <View style={{ gap: Rhythm.cardGap }}>
          <View style={{ flexDirection: 'row', gap: Rhythm.cardGap }}>
            <KpiCard icon="hourglass-outline" label="Por responder" value={String(pendingCount)} />
            <KpiCard icon="checkmark-done-outline" label="Reservas activas" value={String(activeCount)} />
          </View>
          <View style={{ flexDirection: 'row', gap: Rhythm.cardGap }}>
            <KpiCard icon="cube-outline" label="Equipos publicados" value={`${publishedCount}/${listings.length}`} />
            <KpiCard icon="wallet-outline" label="Por cobrar" value={formatPrice(earnings.toCollectNet)} onPress={() => router.push('/provider/earnings' as never)} />
          </View>
          <View style={{ flexDirection: 'row', gap: Rhythm.cardGap }}>
            <KpiCard icon="trending-up-outline" label="Próximos ingresos" value={formatPrice(earnings.upcomingNet)} onPress={() => router.push('/provider/earnings' as never)} />
            <KpiCard icon="time-outline" label="Pendiente de tu respuesta" value={formatPrice(earnings.awaitingNet)} onPress={() => router.push('/provider/earnings' as never)} />
          </View>
        </View>

        {pendingCount > 0 && (
          <View
            accessibilityRole="alert"
            style={{ gap: Spacing.three, backgroundColor: colors.primarySoft, borderRadius: Radius.card, padding: Rhythm.cardPadding + Spacing.one }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }}>
              <Ionicons name="alert-circle" size={20} color={colors.primary} />
              <Text variant="bodyStrong" style={{ flex: 1, minWidth: 0 }}>
                Tienes {pendingCount} {pendingCount === 1 ? 'reserva por responder' : 'reservas por responder'}
              </Text>
            </View>
            <Button label="Revisar reservas" size="sm" fullWidth onPress={() => router.push({ pathname: '/provider/bookings', params: { segment: 'pending' } } as never)} />
          </View>
        )}

        <View style={{ gap: Rhythm.titleToContent }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="headline" accessibilityRole="header">
              Reservas recientes
            </Text>
            <Button
              label="Ver todas"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => router.push('/provider/bookings' as never)}
              style={{ marginRight: -Spacing.three }}
            />
          </View>

          {recentBookings.length === 0 ? (
            <EmptyState icon="calendar-outline" title="Sin reservas por ahora" description="Todavía no has recibido reservas." />
          ) : (
            <View style={{ gap: Rhythm.cardGap }}>
              {recentBookings.map((booking) => (
                <Pressable
                  key={booking.booking_id}
                  onPress={() => router.push({ pathname: '/provider/booking/[id]', params: { id: booking.booking_id } } as never)}
                  accessibilityRole="button"
                  accessibilityLabel={`${booking.listing_title ?? 'Reserva'}, ${booking.client_name ?? ROLE_CLIENT}, ${BOOKING_STATUS_LABELS[booking.status] ?? booking.status}`}
                  accessibilityHint="Abre el detalle de la reserva"
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: Rhythm.cardPadding, backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding, opacity: pressed ? 0.85 : 1 })}
                >
                  <View style={{ width: Thumb.list, height: Thumb.list, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
                    {booking.listing_cover_image_url ? (
                      <Image source={{ uri: booking.listing_cover_image_url }} style={{ width: Thumb.list, height: Thumb.list }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  {/* minWidth 0: el título hace wrap (hasta 2 líneas) y el estado nunca lo empuja. */}
                  <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {booking.listing_title ?? 'Item reservado'}
                    </Text>
                    <Text variant="caption" color="textSecondary" numberOfLines={1}>
                      {booking.client_name ?? ROLE_CLIENT} · {formatShortDate(booking.start_date)}
                    </Text>
                  </View>
                  <View style={{ flexShrink: 0 }}>
                    <Badge label={BOOKING_STATUS_LABELS[booking.status] ?? booking.status} tone={STATUS_TONE[toStatusKey(booking.status)]} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: Rhythm.titleToContent }}>
          <Text variant="headline" accessibilityRole="header">
            Próxima reserva
          </Text>
          {nextBooking ? (
            <Pressable
              onPress={() => router.push({ pathname: '/provider/booking/[id]', params: { id: nextBooking.booking_id } } as never)}
              accessibilityRole="button"
              accessibilityLabel={`${nextBooking.listing_title ?? 'Reserva'}, ${formatDateRange(nextBooking.start_date, nextBooking.end_date)}`}
              accessibilityHint="Abre el detalle de la reserva"
              style={({ pressed }) => ({ gap: Spacing.one, backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding + Spacing.one, opacity: pressed ? 0.85 : 1 })}
            >
              <Text variant="bodyStrong" numberOfLines={2}>
                {nextBooking.listing_title ?? 'Item reservado'}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {nextBooking.client_name ?? ROLE_CLIENT} · {formatDateRange(nextBooking.start_date, nextBooking.end_date)}
              </Text>
              {earningsLabel(nextBooking) ? (
                <Text variant="bodyStrong" color="primary">
                  {earningsLabel(nextBooking)}
                </Text>
              ) : null}
            </Pressable>
          ) : (
            <Text variant="body" color="textSecondary">
              No tienes reservas aceptadas por venir.
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Button label="Ver calendario" icon="calendar-outline" variant="tonal" fullWidth onPress={() => router.push('/(provider)/calendar' as never)} style={{ flex: 1 }} />
            <Button label="Publicar equipo" icon="add-circle-outline" fullWidth onPress={() => router.push('/provider/new-listing' as never)} style={{ flex: 1 }} />
          </View>
        </View>
      </ScrollView>
    </TabScreen>
  );
}
