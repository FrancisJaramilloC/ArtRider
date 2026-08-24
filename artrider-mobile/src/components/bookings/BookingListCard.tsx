import { useState } from 'react';
import { View, Image, Pressable, Modal, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, StatusColors, BOOKING_STATUS_LABELS, toStatusKey } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cancelBooking, submitReview, type ClientBooking } from '@/services/bookingsService';
import { ReviewModal } from '@/components/reviews/ReviewModal';

function fmtDate(dateStr: string): string {
    const d = new Date(dateStr);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

export function BookingListCard({ booking, onCancelled }: { booking: ClientBooking; onCancelled: () => void }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const [showConfirm, setShowConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showReview, setShowReview] = useState(false);

    const statusColors = StatusColors[scheme === 'dark' ? 'dark' : 'light'][toStatusKey(booking.status)];
    const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
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
        <View
            style={{
                flexDirection: 'row',
                gap: Spacing.three,
                padding: Spacing.three,
                backgroundColor: colors.backgroundElement,
                borderRadius: Radius.lg,
            }}
        >
            <View style={{ width: 64, height: 64, borderRadius: Radius.md, overflow: 'hidden' }}>
                {booking.listing_cover_image_url ? (
                    <Image source={{ uri: booking.listing_cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                )}
            </View>

            <View style={{ flex: 1 }}>
                <View
                    style={{
                        alignSelf: 'flex-start',
                        backgroundColor: statusColors.bg,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        marginBottom: 4,
                    }}
                >
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: statusColors.fg }}>
                        {statusLabel}
                    </ThemedText>
                </View>
                <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                    {booking.listing_title ?? 'Equipo reservado'}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {fmtDate(booking.start_date)} - {fmtDate(booking.end_date)}
                </ThemedText>

                {booking.provider_phone && (
                    <Pressable
                        onPress={() => Linking.openURL(`tel:${booking.provider_phone}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}
                    >
                        <Ionicons name="call-outline" size={13} color={colors.primary} />
                        <ThemedText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>
                            {booking.provider_name ?? 'Proveedor'}: {booking.provider_phone}
                        </ThemedText>
                    </Pressable>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                        ${(booking.total_price / 100).toFixed(2)}
                    </ThemedText>
                    {canCancel && (
                        <Pressable onPress={() => setShowConfirm(true)}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.destructive }}>
                                Cancelar
                            </ThemedText>
                        </Pressable>
                    )}
                    {booking.status === 'COMPLETED' && !booking.already_reviewed && (
                        <Pressable onPress={() => setShowReview(true)}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primary }}>
                                Calificar
                            </ThemedText>
                        </Pressable>
                    )}
                </View>
            </View>

            <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.five }}>
                    <View style={{ backgroundColor: colors.background, borderRadius: Radius.lg, padding: Spacing.four, width: '100%' }}>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.two }}>
                            ¿Estás seguro?
                        </ThemedText>
                        <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary, marginBottom: Spacing.four }}>
                            Esta acción cancelará tu reserva y no se puede deshacer.
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