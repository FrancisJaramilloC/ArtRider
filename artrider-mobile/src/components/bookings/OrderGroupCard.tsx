import { useState } from 'react';
import { View, Image, Pressable, Modal, Linking, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { cancelBooking, submitReview, type ClientBooking, type BookingStatus } from '@/services/bookingsService';
import { ReviewModal } from '@/components/reviews/ReviewModal';

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string }> = {
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

function GroupItemRow({ booking, onCancelled }: { booking: ClientBooking; onCancelled: () => void }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const [showConfirm, setShowConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showReview, setShowReview] = useState(false);

    const statusInfo = STATUS_CONFIG[booking.status];
    const canCancel = booking.status === 'AWAITING_SIGNATURES';

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
        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, overflow: 'hidden' }}>
                {booking.listing_cover_image_url ? (
                    <Image source={{ uri: booking.listing_cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                )}
            </View>
            <View style={{ flex: 1 }}>
                <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text }}>
                    {booking.listing_title ?? 'Item reservado'}
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                    {fmtDate(booking.start_date)} - {fmtDate(booking.end_date)}
                </ThemedText>
                {booking.provider_phone && (
                    <Pressable
                        onPress={() => Linking.openURL(`tel:${booking.provider_phone}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}
                    >
                        <Ionicons name="call-outline" size={11} color={colors.primary} />
                        <ThemedText style={{ fontSize: 10.5, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>
                            {booking.provider_phone}
                        </ThemedText>
                    </Pressable>
                )}
            </View>
            <View
                style={{
                    backgroundColor: statusInfo.bg,
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                    borderRadius: 999,
                }}
            >
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 9.5, color: statusInfo.text }}>
                    {statusInfo.label}
                </ThemedText>
            </View>
            {canCancel && (
                <Pressable onPress={() => setShowConfirm(true)} hitSlop={8}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.destructive }}>
                        Cancelar
                    </ThemedText>
                </Pressable>
            )}
            {booking.status === 'COMPLETED' && !booking.already_reviewed && (
                <Pressable onPress={() => setShowReview(true)} hitSlop={8}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.primary }}>
                        Calificar
                    </ThemedText>
                </Pressable>
            )}

            <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.five }}>
                    <View style={{ backgroundColor: colors.background, borderRadius: Radius.lg, padding: Spacing.four, width: '100%' }}>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.two }}>
                            ¿Estás seguro?
                        </ThemedText>
                        <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary, marginBottom: Spacing.four }}>
                            Esto cancelará solo "{booking.listing_title ?? 'este item'}" dentro de tu compra — el resto de items no se ven afectados.
                        </ThemedText>
                        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                            <Pressable
                                onPress={() => setShowConfirm(false)}
                                style={{ flex: 1, paddingVertical: Spacing.three, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                            >
                                <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: colors.text }}>Volver</ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={handleConfirmCancel}
                                disabled={cancelling}
                                style={{ flex: 1, paddingVertical: Spacing.three, borderRadius: Radius.md, backgroundColor: colors.destructive, alignItems: 'center' }}
                            >
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13.5, color: '#fff' }}>
                                    {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                                </ThemedText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

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
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const total = bookings.reduce((sum, b) => sum + b.total_price, 0);

    return (
        <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.lg, padding: Spacing.three }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three }}>
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.textSecondary }}>
                    Compra de {bookings.length} {bookings.length === 1 ? 'item' : 'items'}
                </ThemedText>
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                    ${(total / 100).toFixed(2)}
                </ThemedText>
            </View>

            <View style={{ gap: Spacing.two }}>
                {bookings.map((booking) => (
                    <GroupItemRow key={booking.booking_id} booking={booking} onCancelled={onCancelled} />
                ))}
            </View>
        </View>
    );
}