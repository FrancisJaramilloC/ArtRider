import { useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Text } from '@/components/ui/Text';
import { BOOKING_STATUS_LABELS, MinTouch, Radius, Spacing, toStatusKey, type BookingStatusKey } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cancelBooking, submitReview, type ClientBooking } from '@/services/bookingsService';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { formatShortDate } from '@/utils/format';

const STATUS_TONE: Record<BookingStatusKey, BadgeTone> = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
    completed: 'neutral',
};

function GroupItemRow({ booking, onCancelled }: { booking: ClientBooking; onCancelled: () => void }) {
    const colors = useTheme();
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
        if (!result.error) onCancelled();
    }

    async function handleSubmitReview(rating: number, comment: string) {
        const result = await submitReview(booking.booking_id, rating, comment);
        setShowReview(false);
        if (!result.error) onCancelled();
    }

    return (
        <View style={{ gap: Spacing.two }}>
            <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center' }}>
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
            </View>

            {(booking.provider_phone || canCancel || canReview) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {booking.provider_phone ? (
                        <Pressable
                            onPress={() => Linking.openURL(`tel:${booking.provider_phone}`)}
                            accessibilityRole="link"
                            accessibilityLabel={`Llamar al proveedor ${booking.provider_phone}`}
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

/** Tarjeta para un grupo de reservas que vinieron de una misma compra del carrito. */
export function OrderGroupCard({ bookings, onCancelled }: { bookings: ClientBooking[]; onCancelled: () => void }) {
    const colors = useTheme();
    const total = bookings.reduce((sum, b) => sum + b.total_price, 0);

    return (
        <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.three }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
                <Text variant="captionStrong" color="textSecondary" style={{ flexShrink: 1 }}>
                    Compra de {bookings.length} {bookings.length === 1 ? 'item' : 'items'}
                </Text>
                <Text variant="bodyStrong">${(total / 100).toFixed(2)}</Text>
            </View>

            <View style={{ gap: Spacing.three }}>
                {bookings.map((booking) => (
                    <GroupItemRow key={booking.booking_id} booking={booking} onCancelled={onCancelled} />
                ))}
            </View>
        </View>
    );
}
