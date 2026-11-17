import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { BOOKING_STATUS_LABELS, Radius, Rhythm, Spacing, Thumb, toStatusKey, type BookingStatusKey } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProviderBooking } from '@/services/providerService';
import { formatPrice } from '@/utils/format';
import { formatDateRange } from '@/utils/providerBookings';
import { useBookingActions } from './BookingActions';

export const BOOKING_TONE: Record<BookingStatusKey, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
  completed: 'neutral',
};

type Props = {
  booking: ProviderBooking;
  onOpen: () => void;
  onChanged: () => void;
};

/** Tarjeta de reserva (estilo anfitrión): miniatura, equipo, cliente, fechas, total y estado. Pendientes: Aceptar/Rechazar. */
export function ProviderBookingCard({ booking, onOpen, onChanged }: Props) {
  const colors = useTheme();
  const actions = useBookingActions(booking, onChanged);
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const dates = formatDateRange(booking.start_date, booking.end_date);
  const total = formatPrice(booking.total_price);
  const isPending = booking.status === 'AWAITING_SIGNATURES';

  return (
    <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding, gap: Rhythm.cardPadding }}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${booking.listing_title ?? 'Equipo'}, ${booking.client_name ?? 'cliente'}, ${dates}, ${total}, ${statusLabel}`}
        accessibilityHint="Abre el detalle de la reserva"
        style={({ pressed }) => ({ flexDirection: 'row', gap: Rhythm.cardPadding, opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ width: Thumb.list, height: Thumb.list, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.imageBackdrop }}>
          {booking.listing_cover_image_url ? (
            <Image source={{ uri: booking.listing_cover_image_url }} style={{ width: Thumb.list, height: Thumb.list }} contentFit="contain" transition={150} cachePolicy="memory-disk" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: Spacing.one }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
            <Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1, minWidth: 0 }}>
              {booking.listing_title ?? 'Equipo reservado'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Avatar name={booking.client_name} size={20} />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
              {booking.client_name ?? 'Cliente'}
            </Text>
          </View>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {dates}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingTop: Spacing.one }}>
            <Text variant="bodyStrong">{total}</Text>
            <Badge label={statusLabel} tone={BOOKING_TONE[toStatusKey(booking.status)]} />
          </View>
        </View>
      </Pressable>

      {isPending ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button label="Rechazar" variant="destructive" size="sm" fullWidth disabled={actions.busy} onPress={actions.askReject} style={{ flex: 1 }} />
          <Button label="Aceptar" size="sm" fullWidth loading={actions.busy} onPress={actions.accept} style={{ flex: 1 }} />
        </View>
      ) : null}

      {actions.sheets}
    </View>
  );
}
