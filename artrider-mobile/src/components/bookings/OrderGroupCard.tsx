import { COPY } from '@/constants/copy';
import { useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Text } from '@/components/ui/Text';
import { BOOKING_STATUS_LABELS, MinTouch, Radius, Spacing, toStatusKey, type BookingStatusKey } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/hooks/use-theme';
import { cancelBooking, submitReview, type ClientBooking } from '@/services/bookingsService';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { formatPrice, formatShortDate } from '@/utils/format';
import { orderGroupStatus, orderListSummary, type OrderGroupStatus } from '@/utils/orders';

const STATUS_TONE: Record<BookingStatusKey, BadgeTone> = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
    completed: 'neutral',
};

function GroupItemRow({ booking, onCancelled }: { booking: ClientBooking; onCancelled: () => void }) {
    const colors = useTheme();
    const router = useRouter();
    const { showToast } = useToast();
    const [showConfirm, setShowConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showReview, setShowReview] = useState(false);

    const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
    const canCancel = booking.status === 'AWAITING_SIGNATURES';
    const canReview = booking.status === 'COMPLETED' && !booking.already_reviewed;

    async function handleConfirmCancel() {
        setCancelling(true);
        const result = await cancelBooking(booking.booking_id);
        setCancelling(false);
        setShowConfirm(false);
        if (result.error) showToast(result.error);
        else onCancelled();
    }

    async function handleSubmitReview(rating: number, comment: string) {
        const result = await submitReview(booking.booking_id, rating, comment);
        setShowReview(false);
        if (!result.error) onCancelled();
    }

    return (
        <View style={{ gap: Spacing.two }}>
            <Pressable
                onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.booking_id } } as never)}
                accessibilityRole="button"
                accessibilityLabel={`${booking.listing_title ?? 'Item reservado'}, ${statusLabel}`}
                accessibilityHint="Abre el detalle de la reserva"
                style={({ pressed }) => ({ flexDirection: 'row', gap: Spacing.three, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}
            >
                <View style={{ width: 48, height: 48, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
                    {booking.listing_cover_image_url ? (
                        <Image
                            source={{ uri: booking.listing_cover_image_url }}
                            style={{ width: 48, height: 48 }}
                            contentFit="cover"
                            transition={150}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="image-outline" size={18} color={colors.textMuted} />
                        </View>
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                        {booking.listing_title ?? 'Item reservado'}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                        {formatShortDate(booking.start_date)} - {formatShortDate(booking.end_date)}
                    </Text>
                </View>
                <Badge label={statusLabel} tone={STATUS_TONE[toStatusKey(booking.status)]} />
            </Pressable>

            {(booking.provider_phone || canCancel || canReview) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {booking.provider_phone ? (
                        <Pressable
                            onPress={() => Linking.openURL(`tel:${booking.provider_phone}`)}
                            accessibilityRole="link"
                            accessibilityLabel={COPY.callProvider(booking.provider_phone)}
                            style={{ minHeight: MinTouch, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexShrink: 1 }}
                        >
                            <Ionicons name="call-outline" size={14} color={colors.primary} />
                            <Text variant="captionStrong" color="primary" numberOfLines={1}>
                                {booking.provider_phone}
                            </Text>
                        </Pressable>
                    ) : (
                        <View />
                    )}
                    {canCancel && (
                        <Pressable
                            onPress={() => setShowConfirm(true)}
                            accessibilityRole="button"
                            accessibilityLabel={`Cancelar ${booking.listing_title ?? 'este item'}`}
                            style={{ minHeight: MinTouch, justifyContent: 'center', paddingLeft: Spacing.two }}
                        >
                            <Text variant="captionStrong" color="destructive">
                                Cancelar
                            </Text>
                        </Pressable>
                    )}
                    {canReview && (
                        <Pressable
                            onPress={() => setShowReview(true)}
                            accessibilityRole="button"
                            accessibilityLabel={`Calificar ${booking.listing_title ?? 'este item'}`}
                            style={{ minHeight: MinTouch, justifyContent: 'center', paddingLeft: Spacing.two }}
                        >
                            <Text variant="captionStrong" color="primary">
                                Calificar
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}

            <ConfirmSheet
                visible={showConfirm}
                title="¿Estás seguro?"
                message={`Esto cancelará solo "${booking.listing_title ?? 'este item'}" dentro de tu compra — el resto de items no se ven afectados.`}
                confirmLabel={cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                destructive
                loading={cancelling}
                onConfirm={handleConfirmCancel}
                onCancel={() => setShowConfirm(false)}
            />

            <ReviewModal
                visible={showReview}
                title="Califica tu experiencia"
                subtitle={`¿Cómo fue rentar "${booking.listing_title ?? 'este item'}"?`}
                onCancel={() => setShowReview(false)}
                onSubmit={handleSubmitReview}
            />
        </View>
    );
}

const GROUP_TONE: Record<OrderGroupStatus, BadgeTone> = {
    cancelled: 'danger',
    pending: 'warning',
    confirmed: 'success',
    completed: 'neutral',
    dispute: 'danger',
    other: 'neutral',
};

/** Tarjeta para un grupo de reservas que vinieron de una misma compra del carrito. Abre la pantalla del pedido. */
export function OrderGroupCard({ orderId, bookings, onCancelled }: { orderId: string; bookings: ClientBooking[]; onCancelled: () => void }) {
    const colors = useTheme();
    const router = useRouter();
    // Neto: sin las reservas canceladas, para no contradecir la pantalla del pedido.
    const { net, cancelledCount, count } = orderListSummary(bookings);
    const groupStatus = orderGroupStatus(bookings.map((b) => b.status));

    return (
        <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.three }}>
            <Pressable
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: orderId } } as never)}
                accessibilityRole="button"
                accessibilityLabel={`${COPY.orderPurchaseOf(count)}, ${COPY.orderGroupLabel[groupStatus]}, ${formatPrice(net)}. ${COPY.orderViewAction}`}
                style={({ pressed }) => ({ gap: Spacing.one, opacity: pressed ? 0.85 : 1 })}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
                    <Text variant="captionStrong" color="textSecondary" style={{ flexShrink: 1 }}>
                        {COPY.orderPurchaseOf(count)}
                        {cancelledCount > 0 ? ` · ${COPY.orderCancelledCount(cancelledCount)}` : ''}
                    </Text>
                    <Text variant="bodyStrong">{formatPrice(net)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
                    <Badge label={COPY.orderGroupLabel[groupStatus]} tone={GROUP_TONE[groupStatus]} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.half }}>
                        <Text variant="captionStrong" color="primary">
                            {COPY.orderViewAction}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </View>
                </View>
            </Pressable>

            <View style={{ gap: Spacing.three }}>
                {bookings.map((booking) => (
                    <GroupItemRow key={booking.booking_id} booking={booking} onCancelled={onCancelled} />
                ))}
            </View>
        </View>
    );
}
