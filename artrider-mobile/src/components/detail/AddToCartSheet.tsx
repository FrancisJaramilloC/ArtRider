import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DateRangePicker, type DateRange } from '@/components/bookings/DateRangePicker';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBanner } from '@/components/ui/FormField';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { COPY } from '@/constants/copy';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/use-theme';
import { addToCart } from '@/services/cartService';
import { fetchAvailableUnitsCount, getPackageUnavailableDates, getUnavailableDates } from '@/services/availabilityService';
import { daysInclusive } from '@/utils/calendar';
import { hapticSuccess } from '@/utils/haptics';
import { formatPrice } from '@/utils/format';

export type AddToCartSheetProps = {
  visible: boolean;
  onClose: () => void;
  kind: 'listing' | 'package';
  id: string;
  title: string;
  /** Precio por día en centavos. */
  dailyPrice: number;
  /** Se llama cuando el servicio confirmó que se agregó. */
  onAdded: () => void;
};

/** Alto reservado para cantidad/stock: evita saltos al aparecer o cambiar de estado. */
const STOCK_BLOCK_HEIGHT = 96;

/**
 * Hoja «Agregar al carrito»: fechas en dos pasos, cantidad (solo equipos) y, fija fuera del scroll,
 * la barra con el total y «Agregar · $X». Los días se cuentan salida − llegada + 1, igual que la web y el servidor.
 */
export function AddToCartSheet({ visible, onClose, kind, id, title, dailyPrice, onAdded }: AddToCartSheetProps) {
  const colors = useTheme();
  const isListing = kind === 'listing';

  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cada vez que se cierra, la próxima apertura empieza limpia.
  useEffect(() => {
    if (visible) return;
    setRange({ from: null, to: null });
    setQuantity(1);
    setSubmitError(null);
  }, [visible]);

  const dates = useAsyncData<string[]>(() => (isListing ? getUnavailableDates(id) : getPackageUnavailableDates(id)), {
    enabled: visible,
    deps: [kind, id, visible],
  });

  const complete = range.from !== null && range.to !== null;
  const stock = useAsyncData<number>(() => fetchAvailableUnitsCount(id, range.from!, range.to!), {
    enabled: visible && isListing && complete,
    deps: [id, range.from, range.to],
  });
  const available = isListing && complete && stock.status !== 'loading' && stock.status !== 'error' ? (stock.data ?? 0) : null;

  useEffect(() => {
    if (available !== null) setQuantity((q) => Math.min(q, Math.max(available, 1)));
  }, [available]);

  const days = complete ? daysInclusive(range.from!, range.to!) : 0;
  const units = isListing ? quantity : 1;
  const subtotal = dailyPrice * days * units;
  const checking = isListing && complete && stock.status === 'loading';

  const stockError =
    available === null
      ? null
      : available === 0
        ? 'No hay unidades disponibles para esas fechas.'
        : quantity > available
          ? `Solo hay ${available} ${available === 1 ? 'unidad disponible' : 'unidades disponibles'} para esas fechas.`
          : null;

  const canAdd = complete && !adding && !checking && stock.status !== 'error' && !stockError && dates.status !== 'error';

  async function handleAdd() {
    if (addingRef.current || !canAdd || !range.from || !range.to) return;
    addingRef.current = true;
    setAdding(true);
    setSubmitError(null);
    try {
      const result = await addToCart({
        itemType: kind,
        listingId: isListing ? id : undefined,
        packageId: isListing ? undefined : id,
        startDate: range.from,
        endDate: range.to,
        quantity: units,
      });
      if (result.error) {
        setSubmitError(result.error === 'No autenticado' ? 'Inicia sesión para agregar al carrito.' : 'No se pudo agregar al carrito. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      hapticSuccess();
      onAdded();
      onClose();
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }

  const label = adding ? 'Agregando…' : complete && !stockError ? `Agregar · ${formatPrice(subtotal)}` : 'Agregar al carrito';
  const summary =
    complete && !stockError
      ? `${formatPrice(dailyPrice)} × ${days} ${days === 1 ? 'día' : 'días'}${units > 1 ? ` × ${units}` : ''} · Total estimado`
      : COPY.cartTotalPending;

  const footer = (
    <View style={{ gap: Spacing.two }}>
      {submitError ? <FormErrorBanner message={submitError} onRetry={handleAdd} retrying={adding} /> : null}
      <Text variant="caption" color="textSecondary" style={{ minHeight: 18 }}>
        {summary}
      </Text>
      <Button label={label} onPress={handleAdd} loading={adding} disabled={!canAdd} />
    </View>
  );

  return (
    <Sheet visible={visible} onClose={onClose} footer={visible ? footer : undefined}>
      {visible ? (
        <View style={{ gap: Rhythm.titleToContent, paddingBottom: Spacing.three }}>
          <View style={{ gap: Spacing.half }}>
            <Text variant="subtitle" accessibilityRole="header">
              Agregar al carrito
            </Text>
            <Text variant="body" color="textSecondary" numberOfLines={2}>
              {title}
            </Text>
          </View>

          {dates.status === 'loading' ? (
            <Skeleton height={420} radius={Radius.card} />
          ) : dates.status === 'error' ? (
            <ErrorState error={dates.error} onRetry={dates.reload} />
          ) : (
            <>
              <DateRangePicker blockedDates={dates.data ?? []} onChange={setRange} />

              {isListing && complete ? (
                <View style={{ minHeight: STOCK_BLOCK_HEIGHT, gap: Spacing.two, justifyContent: 'center' }}>
                  {stock.status === 'loading' ? (
                    <Skeleton height={STOCK_BLOCK_HEIGHT - Spacing.two} radius={Radius.card} />
                  ) : stock.status === 'error' ? (
                    <ErrorState error={stock.error} onRetry={stock.reload} style={{ paddingVertical: Spacing.two }} />
                  ) : available !== null && available > 0 ? (
                    <>
                      <QuantityStepper label="Cantidad" value={quantity} max={available} onChange={setQuantity} />
                      <Text variant="caption" color="textSecondary">
                        {available} {available === 1 ? 'unidad disponible' : 'unidades disponibles'} para esas fechas
                      </Text>
                    </>
                  ) : null}
                  {stockError ? <FieldError message={stockError} color={colors.destructive} /> : null}
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}

function FieldError({ message, color }: { message: string; color: string }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }}>
      <Ionicons name="alert-circle" size={16} color={color} style={{ marginTop: Spacing.half }} />
      <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }}>
        {message}
      </Text>
    </View>
  );
}
