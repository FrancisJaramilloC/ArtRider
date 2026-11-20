import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ReviewModal } from '@/components/reviews/ReviewModal';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Text } from '@/components/ui/Text';
import { COPY } from '@/constants/copy';
import { BOOKING_STATUS_LABELS, MinTouch, Radius, Spacing, toStatusKey, type BookingStatusKey } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/hooks/use-theme';
import { cancelBooking, submitReview, type ClientOrderLine } from '@/services/bookingsService';
import { formatPrice } from '@/utils/format';
import { lineRefund } from '@/utils/orders';
import { formatDateRange } from '@/utils/providerBookings';

const STATUS_TONE: Record<BookingStatusKey, BadgeTone> = { pending: 'warning', confirmed: 'success', cancelled: 'danger', completed: 'neutral' };
const THUMB = 56;

/** Una reserva del pedido: abre su detalle, se cancela si espera respuesta y se califica al completarse. La cancelada va atenuada y muestra su reembolso. */
export function OrderLineRow({ line, charged, onChanged }: { line: ClientOrderLine; charged: boolean; onChanged: () => void }) {
  const colors = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const title = line.title ?? 'Item reservado';
  const statusLabel = BOOKING_STATUS_LABELS[line.status] ?? line.status;
  const cancelled = line.status === 'CANCELLED';
  const canCancel = line.status === 'AWAITING_SIGNATURES';
  const canReview = line.status === 'COMPLETED' && !line.already_reviewed;
  const refund = lineRefund(line, charged);

  async function handleConfirmCancel() {
    setCancelling(true);
    const result = await cancelBooking(line.booking_id);
    setCancelling(false);
    setConfirmCancel(false);
    if (result.error) showToast(result.error);
    else onChanged();
  }

  async function handleSubmitReview(rating: number, comment: string) {
    const result = await submitReview(line.booking_id, rating, comment);
    setShowReview(false);
    if (result.error) showToast(result.error);
    else onChanged();
  }

  return (
    <View style={{ gap: Spacing.two }}>
      <Pressable
        onPress={() => router.push({ pathname: '/booking/[id]', params: { id: line.booking_id } } as never)}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${statusLabel}, ${formatPrice(line.total_price)}`}
        accessibilityHint={COPY.orderLineOpenHint}
        style={({ pressed }) => ({ flexDirection: 'row', gap: Spacing.three, alignItems: 'center', opacity: cancelled ? 0.55 : pressed ? 0.85 : 1 })}
      >
        <View style={{ width: THUMB, height: THUMB, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
          {line.cover_image_url ? (
            <Image source={{ uri: line.cover_image_url }} style={{ width: THUMB, height: THUMB }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={20} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {formatDateRange(line.start_date, line.end_date)}
            {line.quantity > 1 ? ` · x${line.quantity}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' }}>
            <Badge label={statusLabel} tone={STATUS_TONE[toStatusKey(line.status)]} />
            {cancelled && refund > 0 ? (
              <Text variant="captionStrong" color="textSecondary">
                {`${COPY.orderLineRefund}: ${formatPrice(refund)}`}
              </Text>
            ) : null}
          </View>
        </View>
        <Text variant="bodyStrong" style={cancelled ? { textDecorationLine: 'line-through' } : undefined}>
          {formatPrice(line.total_price)}
        </Text>
      </Pressable>

      {canCancel || canReview ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          {canCancel ? (
            <Pressable
              onPress={() => setConfirmCancel(true)}
              accessibilityRole="button"
              accessibilityLabel={`Cancelar ${title}`}
              style={{ minHeight: MinTouch, justifyContent: 'center', paddingLeft: Spacing.two }}
            >
              <Text variant="captionStrong" color="destructive">
                Cancelar
              </Text>
            </Pressable>
          ) : null}
          {canReview ? (
            <Pressable
              onPress={() => setShowReview(true)}
              accessibilityRole="button"
              accessibilityLabel={`Calificar ${title}`}
              style={{ minHeight: MinTouch, justifyContent: 'center', paddingLeft: Spacing.two }}
            >
              <Text variant="captionStrong" color="primary">
                Calificar
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmCancel}
        title="¿Estás seguro?"
        message={COPY.orderLineCancelConfirm(title)}
        confirmLabel={cancelling ? 'Cancelando...' : 'Sí, cancelar'}
        destructive
        loading={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setConfirmCancel(false)}
      />

      <ReviewModal
        visible={showReview}
        title="Califica tu experiencia"
        subtitle={`¿Cómo fue rentar "${title}"?`}
        onCancel={() => setShowReview(false)}
        onSubmit={handleSubmitReview}
      />
    </View>
  );
}
