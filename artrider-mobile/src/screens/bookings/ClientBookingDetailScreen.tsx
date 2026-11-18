import { COPY, ROLE_PROVIDER } from '@/constants/copy';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpandableText, SpecGrid, type SpecItem } from '@/components/detail/DetailParts';
import { BOOKING_TONE } from '@/components/provider/ProviderBookingCard';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { InfoCard } from '@/components/ui/InfoCard';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { Text } from '@/components/ui/Text';
import { CATEGORY_LABELS } from '@/constants/categories';
import { BOOKING_STATUS_LABELS, MinTouch, Radius, Rhythm, Spacing, toStatusKey } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { cancelBooking, getClientBookingDetail, submitReview, type ClientBookingDetail } from '@/services/bookingsService';
import { findExistingConversation } from '@/services/messagesService';
import { specDisplayItems } from '@/constants/listingSpecs';
import { formatPrice } from '@/utils/format';
import { riderBreakdownOf } from '@/utils/pricing';
import { formatDateRange, rentalDays } from '@/utils/providerBookings';

const PHONE_VISIBLE: ReadonlySet<string> = new Set(['ACTIVE', 'PAID', 'COMPLETED']);

function Detail({ booking, onChanged }: { booking: ClientBookingDetail; onChanged: () => void }) {
  const colors = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const { gutter, contentWidth } = useLayout();
  const [opening, setOpening] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const days = rentalDays(booking.start_date, booking.end_date);
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const statusLine = COPY.bookingStatusLine[booking.status] ?? '';
  const itemTitle = booking.title ?? 'Equipo reservado';
  const providerName = booking.provider_name ?? COPY.providerFallbackName;
  const category = booking.category ? (CATEGORY_LABELS[booking.category] ?? null) : null;
  // Reservas anteriores al nuevo modelo no traen el desglose guardado: se calcula el del modelo anterior. Nunca montos del Partner.
  const { subtotal, serviceFee } = riderBreakdownOf({ riderSubtotal: booking.rider_subtotal, serviceFee: booking.service_fee }, booking.total_price);

  // Marca, modelo y especificaciones con dato: nunca se muestra un campo vacío.
  const specs: SpecItem[] = [
    booking.brand?.trim() ? { label: 'Marca', value: booking.brand.trim() } : null,
    booking.model?.trim() ? { label: 'Modelo', value: booking.model.trim() } : null,
    ...specDisplayItems(booking.category, booking.specs),
  ].filter((x): x is SpecItem => x !== null);

  const canCancel = booking.status === 'AWAITING_SIGNATURES';
  const canReview = booking.status === 'COMPLETED' && !booking.already_reviewed;
  const canRebook = (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') && booking.item_available && !!booking.item_id;
  const showPhone = !!booking.provider_phone && PHONE_VISIBLE.has(booking.status);

  async function handleConfirmCancel() {
    setCancelling(true);
    const result = await cancelBooking(booking.booking_id);
    setCancelling(false);
    setConfirmCancel(false);
    if (result.error) showToast(result.error);
    else onChanged();
  }

  async function handleSubmitReview(rating: number, comment: string) {
    const result = await submitReview(booking.booking_id, rating, comment);
    setShowReview(false);
    if (result.error) showToast(result.error);
    else onChanged();
  }

  function rebook() {
    if (!booking.item_id) return;
    if (booking.item_type === 'package') router.push({ pathname: '/package/[id]', params: { id: booking.item_id } });
    else router.push({ pathname: '/listing/[id]', params: { id: booking.item_id } });
  }

  /** Abre el chat con el Partner (existente o nuevo), como desde el detalle del equipo. */
  async function openChat() {
    if (opening || !booking.provider_id) return;
    setOpening(true);
    try {
      const isPackage = booking.item_type === 'package';
      const existingId = await findExistingConversation(booking.provider_id, isPackage ? null : booking.item_id, isPackage ? booking.item_id : null);
      if (existingId) {
        router.push({ pathname: '/chat/[id]', params: { id: existingId, otherName: providerName } });
      } else {
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: 'new',
            otherName: providerName,
            providerId: booking.provider_id,
            ...(isPackage ? { packageId: booking.item_id ?? '' } : { listingId: booking.item_id ?? '' }),
          },
        });
      }
    } catch {
      showToast('No pudimos abrir el chat. Intenta de nuevo.');
    } finally {
      setOpening(false);
    }
  }

  const footerButtons = [
    canCancel ? <Button key="cancel" label="Cancelar reserva" variant="destructive" onPress={() => setConfirmCancel(true)} style={{ flex: 1 }} /> : null,
    canReview ? <Button key="review" label="Reseñar" onPress={() => setShowReview(true)} style={{ flex: 1 }} /> : null,
    canRebook ? <Button key="rebook" label="Reservar de nuevo" variant={canReview ? 'tonal' : 'primary'} onPress={rebook} style={{ flex: 1 }} /> : null,
  ].filter(Boolean);

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: gutter, paddingBottom: Spacing.five, gap: Rhythm.cardGap, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
      >
        <View style={{ gap: Spacing.two, alignItems: 'flex-start' }} accessible accessibilityLabel={`${statusLabel}. ${statusLine}`}>
          <Badge label={statusLabel} tone={BOOKING_TONE[toStatusKey(booking.status)]} />
          <Text variant="body" color="textSecondary">
            {statusLine}
          </Text>
        </View>

        <InfoCard title="Fechas">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong">{formatDateRange(booking.start_date, booking.end_date)}</Text>
              <Text variant="caption" color="textSecondary">
                {days} {days === 1 ? 'día' : 'días'}
                {booking.quantity > 1 ? ` · ${booking.quantity} unidades` : ''}
              </Text>
            </View>
          </View>
        </InfoCard>

        <InfoCard title={booking.item_type === 'package' ? 'Paquete' : 'Equipo'}>
          {booking.cover_image_url ? (
            <View style={{ aspectRatio: 16 / 9, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.imageBackdrop }}>
              <Image source={{ uri: booking.cover_image_url }} style={{ flex: 1 }} contentFit="contain" transition={150} cachePolicy="memory-disk" accessibilityLabel={itemTitle} />
            </View>
          ) : null}
          <View style={{ gap: Spacing.one }}>
            <Text variant="subtitle" numberOfLines={3}>
              {itemTitle}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two }}>
              {category ? <Badge label={category} tone="neutral" /> : null}
              {booking.city ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text variant="caption" color="textSecondary">
                    {booking.city}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          {booking.description ? <ExpandableText text={booking.description} /> : null}
          {specs.length > 0 ? <SpecGrid items={specs} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} style={{ marginTop: Spacing.half }} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {COPY.bookingAddressNotice}
            </Text>
          </View>
        </InfoCard>

        <InfoCard title={ROLE_PROVIDER}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <Avatar uri={booking.provider_avatar_url} name={providerName} size={44} />
            <Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1, minWidth: 0 }}>
              {providerName}
            </Text>
            {booking.provider_id ? <Button label="Mensaje" icon="chatbubble-outline" variant="tonal" size="sm" fullWidth={false} loading={opening} onPress={openChat} /> : null}
          </View>
          {showPhone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${booking.provider_phone}`)}
              accessibilityRole="link"
              accessibilityLabel={COPY.callProvider(booking.provider_phone as string)}
              style={{ minHeight: MinTouch, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}
            >
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text variant="bodyStrong" color="primary">
                {booking.provider_phone}
              </Text>
            </Pressable>
          ) : null}
        </InfoCard>

        <InfoCard title="Pago">
          <PriceSummary
            lines={[
              { label: `${days} ${days === 1 ? 'día' : 'días'} de alquiler${booking.quantity > 1 ? ` × ${booking.quantity}` : ''}`, value: formatPrice(subtotal) },
              { label: 'Tarifa de servicio', value: formatPrice(serviceFee) },
            ]}
            totalLabel="Total"
            total={formatPrice(booking.total_price)}
          />
          {booking.status === 'CANCELLED' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three }}>
              <Text variant="bodyStrong">{COPY.bookingRefundRequested}</Text>
              <Text variant="bodyStrong">{formatPrice(booking.total_price)}</Text>
            </View>
          ) : null}
          {booking.kushki_ticket ? (
            <View style={{ gap: Spacing.half }}>
              <Text variant="caption" color="textSecondary">
                {COPY.bookingPaymentReference}
              </Text>
              <Text variant="caption" selectable>
                {booking.kushki_ticket}
              </Text>
            </View>
          ) : null}
        </InfoCard>

        <InfoCard title={COPY.bookingCancellationTitle}>
          <Text variant="body" color="textSecondary">
            {COPY.bookingCancellationPolicy}
          </Text>
        </InfoCard>
      </ScrollView>

      {footerButtons.length > 0 ? (
        <StickyFooter>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>{footerButtons}</View>
        </StickyFooter>
      ) : null}

      <ConfirmSheet
        visible={confirmCancel}
        title="¿Estás seguro?"
        message={COPY.bookingCancelConfirm}
        confirmLabel={cancelling ? 'Cancelando...' : 'Sí, cancelar'}
        destructive
        loading={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setConfirmCancel(false)}
      />

      <ReviewModal
        visible={showReview}
        title="Califica tu experiencia"
        subtitle={`¿Cómo fue rentar "${itemTitle}"?`}
        onCancel={() => setShowReview(false)}
        onSubmit={handleSubmitReview}
      />
    </>
  );
}

/** Detalle de una reserva del Rider: estado, fechas, equipo, Partner, pago y acciones según el estado. */
export function ClientBookingDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { gutter } = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, status, error, reload } = useAsyncData<ClientBookingDetail | null>(() => getClientBookingDetail(id), {
    enabled: !!id,
    deps: [id],
    reloadOnFocus: true,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader title={COPY.bookingDetailTitle} />
      {status === 'error' ? (
        <ErrorState fill error={error} onRetry={reload} />
      ) : status === 'loading' ? (
        <View style={{ padding: gutter, gap: Rhythm.cardGap }}>
          <Skeleton height={64} radius={Radius.card} />
          <Skeleton height={96} radius={Radius.card} />
          <Skeleton height={220} radius={Radius.card} />
          <Skeleton height={120} radius={Radius.card} />
        </View>
      ) : !data ? (
        <EmptyState
          fill
          icon="calendar-outline"
          title={COPY.bookingNotFoundTitle}
          description={COPY.bookingNotFoundBody}
          actionLabel="Ver mis reservas"
          onAction={() => router.replace('/(tabs)/reservations' as never)}
        />
      ) : (
        <Detail booking={data} onChanged={reload} />
      )}
    </SafeAreaView>
  );
}
