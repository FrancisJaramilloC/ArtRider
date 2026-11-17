import { ROLE_PROVIDER } from '@/constants/copy';
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

export function BookingListCard({ booking, onCancelled }: { booking: ClientBooking; onCancelled: () => void }) {
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
        <View
            style={{
                flexDirection: 'row',
                gap: Spacing.three,
                padding: Spacing.three,
                backgroundColor: colors.backgroundElement,
                borderRadius: Radius.card,
            }}
        >
            <View style={{ width: 72, height: 72, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
                {booking.listing_cover_image_url ? (
                    <Image
                        source={{ uri: booking.listing_cover_image_url }}
                        style={{ width: 72, height: 72 }}
                        contentFit="cover"
                        transition={150}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                    </View>
                )}
            </View>

            <View style={{ flex: 1, gap: Spacing.half }}>
                <Badge label={statusLabel} tone={STATUS_TONE[toStatusKey(booking.status)]} />
                <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: Spacing.one }}>
                    {booking.listing_title ?? 'Equipo reservado'}
                </Text>
                <Text variant="caption" color="textSecondary">
                    {formatShortDate(booking.start_date)} - {formatShortDate(booking.end_date)}
                </Text>

                {booking.provider_phone ? (
                    <Pressable
                        onPress={() => Linking.openURL(`tel:${booking.provider_phone}`)}
                        accessibilityRole="link"
                        accessibilityLabel={`Llamar a ${booking.provider_name ?? ROLE_PROVIDER}`}
                        style={{ minHeight: MinTouch, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}
                    >
                        <Ionicons name="call-outline" size={14} color={colors.primary} />
                        <Text variant="captionStrong" color="primary" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {booking.provider_name ?? ROLE_PROVIDER}: {booking.provider_phone}
                        </Text>
                    </Pressable>
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 }}>
                    <Text variant="bodyStrong">${(booking.total_price / 100).toFixed(2)}</Text>
                    {canCancel && (
                        <Pressable
                            onPress={() => setShowConfirm(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Cancelar reserva"
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
                            accessibilityLabel="Calificar reserva"
                            style={{ minHeight: MinTouch, justifyContent: 'center', paddingLeft: Spacing.two }}
                        >
                            <Text variant="captionStrong" color="primary">
                                Calificar
                            </Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <ConfirmSheet
                visible={showConfirm}
                title="¿Estás seguro?"
                message="Esta acción cancelará tu reserva y no se puede deshacer."
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
