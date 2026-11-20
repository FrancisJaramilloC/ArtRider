import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderLineRow } from '@/components/bookings/OrderLineRow';
import { BOOKING_TONE } from '@/components/provider/ProviderBookingCard';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { InfoCard } from '@/components/ui/InfoCard';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { COPY } from '@/constants/copy';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getClientOrderDetail, type ClientOrderDetail } from '@/services/bookingsService';
import { formatPrice } from '@/utils/format';
import { orderGroupStatus, orderRefundSummary, type OrderGroupStatus } from '@/utils/orders';
import { riderBreakdownOf } from '@/utils/pricing';

const GROUP_TONE: Record<OrderGroupStatus, BadgeTone> = {
  cancelled: BOOKING_TONE.cancelled,
  pending: BOOKING_TONE.pending,
  confirmed: BOOKING_TONE.confirmed,
  completed: BOOKING_TONE.completed,
  dispute: BOOKING_TONE.cancelled,
  other: 'neutral',
};

function Detail({ detail, onChanged }: { detail: ClientOrderDetail; onChanged: () => void }) {
  const { gutter, contentWidth } = useLayout();
  const { order, lines } = detail;

  const groupStatus = orderGroupStatus(lines.map((l) => l.status));
  const charged = !!order.kushki_ticket;
  const { refunded, net } = orderRefundSummary(lines, order.total_price, charged);
  // Pedidos anteriores al nuevo modelo no traen el desglose guardado: se calcula el del modelo anterior. Nunca montos del Partner.
  const { subtotal, serviceFee } = riderBreakdownOf({ riderSubtotal: order.subtotal, serviceFee: order.service_fee }, order.total_price);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: gutter, paddingBottom: Spacing.five, gap: Rhythm.cardGap, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
    >
      <View style={{ gap: Spacing.two, alignItems: 'flex-start' }} accessible accessibilityLabel={`${COPY.orderGroupLabel[groupStatus]}. ${COPY.orderGroupLine[groupStatus]}`}>
        <Badge label={COPY.orderGroupLabel[groupStatus]} tone={GROUP_TONE[groupStatus]} />
        <Text variant="body" color="textSecondary">
          {COPY.orderGroupLine[groupStatus]}
        </Text>
      </View>

      <InfoCard title={`${COPY.orderItemsTitle} · ${COPY.orderPurchaseOf(lines.length)}`}>
        <View style={{ gap: Spacing.four }}>
          {lines.map((line) => (
            <OrderLineRow key={line.booking_id} line={line} charged={charged} onChanged={onChanged} />
          ))}
        </View>
      </InfoCard>

      <InfoCard title={COPY.orderPaymentTitle}>
        <PriceSummary
          lines={[
            { label: 'Subtotal', value: formatPrice(subtotal) },
            { label: 'Tarifa de servicio', value: formatPrice(serviceFee) },
          ]}
          totalLabel={COPY.orderTotalPaid}
          total={formatPrice(order.total_price)}
        />
        {refunded > 0 ? (
          <View style={{ gap: Spacing.one }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
              <Text variant="bodyStrong">{COPY.orderRefunded}</Text>
              <Text variant="bodyStrong">{`−${formatPrice(refunded)}`}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
              <Text variant="bodyStrong">{COPY.orderNet}</Text>
              <Text variant="bodyStrong">{formatPrice(net)}</Text>
            </View>
          </View>
        ) : null}
        {order.kushki_ticket ? (
          <View style={{ gap: Spacing.half }}>
            <Text variant="caption" color="textSecondary">
              {COPY.bookingPaymentReference}
            </Text>
            <Text variant="caption" selectable>
              {order.kushki_ticket}
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
  );
}

/** Detalle de un pedido del carrito del Rider: estado del grupo, cada reserva con su acción, pago, reembolso y neto. */
export function ClientOrderDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { gutter } = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, status, error, reload } = useAsyncData<ClientOrderDetail | null>(() => getClientOrderDetail(id), {
    enabled: !!id,
    deps: [id],
    reloadOnFocus: true,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader title={COPY.orderDetailTitle} />
      {status === 'error' ? (
        <ErrorState fill error={error} onRetry={reload} />
      ) : status === 'loading' ? (
        <View style={{ padding: gutter, gap: Rhythm.cardGap }}>
          <Skeleton height={64} radius={Radius.card} />
          <Skeleton height={220} radius={Radius.card} />
          <Skeleton height={140} radius={Radius.card} />
        </View>
      ) : !data ? (
        <EmptyState
          fill
          icon="receipt-outline"
          title={COPY.orderNotFoundTitle}
          description={COPY.orderNotFoundBody}
          actionLabel="Ver mis reservas"
          onAction={() => router.replace('/(tabs)/reservations' as never)}
        />
      ) : (
        <Detail detail={data} onChanged={reload} />
      )}
    </SafeAreaView>
  );
}
