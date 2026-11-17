import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DateRangePicker, type DateRange } from '@/components/bookings/DateRangePicker';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBanner } from '@/components/ui/FormField';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/use-theme';
import { addToCart } from '@/services/cartService';
import { getAvailableUnitsCount, getPackageUnavailableDates, getUnavailableDates } from '@/services/availabilityService';
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

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1;
}

/** Hoja «Agregar al carrito»: fechas, cantidad (solo equipos), total estimado y confirmación. */
export function AddToCartSheet(props: AddToCartSheetProps) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose}>
      {props.visible ? <SheetBody {...props} /> : null}
    </Sheet>
  );
}

function SheetBody({ onClose, kind, id, title, dailyPrice, onAdded }: AddToCartSheetProps) {
  const colors = useTheme();
  const isListing = kind === 'listing';

  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [quantity, setQuantity] = useState(1);
  const [available, setAvailable] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { status, data: blockedDates, error, reload } = useAsyncData<string[]>(
    () => (isListing ? getUnavailableDates(id) : getPackageUnavailableDates(id)),
    { deps: [kind, id] },
  );

  // Stock real para el rango elegido (solo equipos; el paquete valida por fechas bloqueadas).
  useEffect(() => {
    if (!isListing || !range.from || !range.to) {
      setAvailable(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    getAvailableUnitsCount(id, range.from, range.to)
      .then((count) => {
        if (cancelled) return;
        setAvailable(count);
        setQuantity((q) => Math.min(q, Math.max(count, 1)));
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isListing, id, range.from, range.to]);

  const hasRange = !!(range.from && range.to);
  const days = hasRange ? daysBetween(range.from!, range.to!) : 0;
  const unitsForTotal = isListing ? quantity : 1;
  const subtotal = dailyPrice * days * unitsForTotal;

  const dateError = triedSubmit && !hasRange ? 'Selecciona las fechas para agregarlo al carrito.' : null;
  const stockError =
    isListing && hasRange && !checking && available !== null
      ? available === 0
        ? 'No hay unidades disponibles para esas fechas.'
        : quantity > available
          ? `Solo hay ${available} ${available === 1 ? 'unidad disponible' : 'unidades disponibles'} para esas fechas.`
          : null
      : null;

  async function handleAdd() {
    if (adding) return;
    setTriedSubmit(true);
    if (!range.from || !range.to || stockError || checking) return;
    setAdding(true);
    setSubmitError(null);
    const result = await addToCart({
      itemType: kind,
      listingId: isListing ? id : undefined,
      packageId: isListing ? undefined : id,
      startDate: range.from,
      endDate: range.to,
      quantity: unitsForTotal,
    });
    setAdding(false);
    if (result.error) {
      setSubmitError(result.error === 'No autenticado' ? 'Inicia sesión para agregar al carrito.' : 'No se pudo agregar al carrito. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    hapticSuccess();
    onAdded();
    onClose();
  }

  const label = adding ? 'Agregando…' : hasRange ? `Agregar · ${formatPrice(subtotal)}` : 'Agregar al carrito';

  return (
    <View style={{ gap: Rhythm.titleToContent }}>
      <View style={{ gap: Spacing.half }}>
        <Text variant="subtitle" accessibilityRole="header">
          Agregar al carrito
        </Text>
        <Text variant="body" color="textSecondary" numberOfLines={2}>
          {title}
        </Text>
      </View>

      {status === 'loading' ? (
        <Skeleton height={320} radius={Radius.card} />
      ) : status === 'error' ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <View style={{ gap: Spacing.two }}>
            <Text variant="bodyStrong">Fechas</Text>
            <DateRangePicker blockedDates={blockedDates ?? []} onChange={setRange} />
            {dateError ? <FieldError message={dateError} /> : null}
          </View>

          {isListing && hasRange ? (
            <View style={{ gap: Spacing.two }}>
              {checking ? (
                <ActivityIndicator color={colors.primary} />
              ) : available !== null && available > 0 ? (
                <>
                  <QuantityStepper label="Cantidad" value={quantity} max={available} onChange={setQuantity} />
                  <Text variant="caption" color="textSecondary">
                    {available} {available === 1 ? 'unidad disponible' : 'unidades disponibles'} para esas fechas
                  </Text>
                </>
              ) : null}
              {stockError ? <FieldError message={stockError} /> : null}
            </View>
          ) : null}

          {hasRange && !stockError ? (
            <PriceSummary
              lines={[{ label: `${formatPrice(dailyPrice)} × ${days} ${days === 1 ? 'día' : 'días'}${unitsForTotal > 1 ? ` × ${unitsForTotal}` : ''}`, value: formatPrice(subtotal) }]}
              totalLabel="Total estimado"
              total={formatPrice(subtotal)}
            />
          ) : null}

          {submitError ? <FormErrorBanner message={submitError} onRetry={handleAdd} retrying={adding} /> : null}

          <Button label={label} onPress={handleAdd} loading={adding} disabled={checking || !!stockError} />
        </>
      )}
    </View>
  );
}

function FieldError({ message }: { message: string }) {
  const colors = useTheme();
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }}>
      <Ionicons name="alert-circle" size={16} color={colors.destructive} style={{ marginTop: Spacing.half }} />
      <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }}>
        {message}
      </Text>
    </View>
  );
}
