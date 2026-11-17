import { COPY, ROLE_CLIENT } from '@/constants/copy';
import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBookingActions } from '@/components/provider/BookingActions';
import { BOOKING_TONE } from '@/components/provider/ProviderBookingCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { Text } from '@/components/ui/Text';
import { BOOKING_STATUS_LABELS, MinTouch, Radius, Rhythm, Spacing, Thumb, toStatusKey } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getConversations } from '@/services/messagesService';
import { getProviderBookings, type ProviderBooking } from '@/services/providerService';
import { formatPrice } from '@/utils/format';
import { formatDateRange, rentalDays } from '@/utils/providerBookings';

const STATUS_LINE: Record<ProviderBooking['status'], string> = {
  AWAITING_SIGNATURES: 'Esperando tu respuesta. Acepta o rechaza esta solicitud.',
  PAID: 'Reserva confirmada y pagada. Aún no comienza.',
  ACTIVE: 'El equipo está rentado. Finaliza la reserva cuando te lo devuelvan.',
  COMPLETED: 'Reserva finalizada.',
  DISPUTE: 'Esta reserva tiene una disputa abierta.',
  CANCELLED: 'Reserva cancelada.',
  ARCHIVED: 'Reserva archivada.',
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding + Spacing.one, gap: Rhythm.cardPadding }}>
      <Text variant="overline" color="textSecondary" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Detail({ booking, onChanged }: { booking: ProviderBooking; onChanged: () => void }) {
  const colors = useTheme();
  const router = useRouter();
  const { gutter, contentWidth } = useLayout();
  const actions = useBookingActions(booking, onChanged);
  const [opening, setOpening] = useState(false);

  const days = rentalDays(booking.start_date, booking.end_date);
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;

  /** Abre el chat existente con este cliente (por reserva, o por equipo + nombre). No crea conversaciones. */
  async function openChat() {
    if (opening) return;
    setOpening(true);
    try {
      const all = await getConversations();
      const match =
        all.find((c) => c.booking_id === booking.booking_id) ??
        all.find((c) => c.listing_id === booking.listing_id && c.other_name === booking.client_name);
      if (match) router.push({ pathname: '/chat/[id]', params: { id: match.id, otherName: match.other_name } });
      else router.push('/(provider)/messages' as never);
    } catch {
      router.push('/(provider)/messages' as never);
    } finally {
      setOpening(false);
    }
  }

  const footer =
    booking.status === 'AWAITING_SIGNATURES' ? (
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <Button label="Rechazar" variant="destructive" disabled={actions.busy} onPress={actions.askReject} style={{ flex: 1 }} />
        <Button label="Aceptar" loading={actions.busy} onPress={actions.accept} style={{ flex: 1 }} />
      </View>
    ) : booking.status === 'ACTIVE' ? (
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <Button label="Cancelar" variant="destructive" disabled={actions.busy} onPress={actions.askReject} style={{ flex: 1 }} />
        <Button label="Finalizar" disabled={actions.busy} onPress={actions.askFinalize} style={{ flex: 1 }} />
      </View>
    ) : null;

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: gutter, paddingBottom: Spacing.five, gap: Rhythm.cardGap, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
      >
        <View style={{ gap: Spacing.two, alignItems: 'flex-start' }} accessible accessibilityLabel={`${statusLabel}. ${STATUS_LINE[booking.status]}`}>
          <Badge label={statusLabel} tone={BOOKING_TONE[toStatusKey(booking.status)]} />
          <Text variant="body" color="textSecondary">
            {STATUS_LINE[booking.status]}
          </Text>
        </View>

        <Card title="Fechas">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong">{formatDateRange(booking.start_date, booking.end_date)}</Text>
              <Text variant="caption" color="textSecondary">
                {days} {days === 1 ? 'día' : 'días'}
              </Text>
            </View>
          </View>
        </Card>

        <Card title="Equipo">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <View style={{ width: Thumb.list, height: Thumb.list, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.imageBackdrop }}>
              {booking.listing_cover_image_url ? (
                <Image source={{ uri: booking.listing_cover_image_url }} style={{ width: Thumb.list, height: Thumb.list }} contentFit="contain" cachePolicy="memory-disk" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <Text variant="bodyStrong" numberOfLines={3} style={{ flex: 1, minWidth: 0 }}>
              {booking.listing_title ?? 'Equipo reservado'}
            </Text>
          </View>
        </Card>

        <Card title={COPY.clientCardTitle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <Avatar name={booking.client_name} size={44} />
            <Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1, minWidth: 0 }}>
              {booking.client_name ?? ROLE_CLIENT}
            </Text>
            <Button label="Mensaje" icon="chatbubble-outline" variant="tonal" size="sm" fullWidth={false} loading={opening} onPress={openChat} />
          </View>
          {booking.client_phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${booking.client_phone}`)}
              accessibilityRole="link"
              accessibilityLabel={COPY.callClient(booking.client_phone)}
              style={{ minHeight: MinTouch, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}
            >
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text variant="bodyStrong" color="primary">
                {booking.client_phone}
              </Text>
            </Pressable>
          ) : null}
        </Card>

        <Card title="Desglose del precio">
          <PriceSummary
            lines={[{ label: `${days} ${days === 1 ? 'día' : 'días'} de alquiler`, value: formatPrice(booking.total_price) }]}
            totalLabel="Total de la reserva"
            total={formatPrice(booking.total_price)}
          />
        </Card>
      </ScrollView>

      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
      {actions.sheets}
    </>
  );
}

export function ProviderBookingDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { gutter } = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Los servicios no tienen «reserva por id»: se busca en la lista del proveedor.
  const { data, status, error, reload } = useAsyncData<ProviderBooking | null>(
    async () => (await getProviderBookings()).find((b) => b.booking_id === id) ?? null,
    { enabled: !!id, deps: [id], reloadOnFocus: true },
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader title="Reserva" />
      {status === 'error' ? (
        <ErrorState fill error={error} onRetry={reload} />
      ) : status === 'loading' ? (
        <View style={{ padding: gutter, gap: Rhythm.cardGap }}>
          <Skeleton height={64} radius={Radius.card} />
          <Skeleton height={96} radius={Radius.card} />
          <Skeleton height={120} radius={Radius.card} />
        </View>
      ) : !data ? (
        <EmptyState
          fill
          icon="calendar-outline"
          title="No encontramos esta reserva"
          description="Puede que ya no esté disponible."
          actionLabel="Ver reservas"
          onAction={() => router.replace('/provider/bookings' as never)}
        />
      ) : (
        <Detail booking={data} onChanged={reload} />
      )}
    </SafeAreaView>
  );
}
