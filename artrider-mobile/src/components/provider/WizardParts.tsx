import type { ReactNode, RefObject } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Aspect, MinTouch, Radius, Rhythm, Spacing, WizardType } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import type { FieldBinding } from '@/hooks/useForm';
import { formatPrice } from '@/utils/format';
import { usePricing } from '@/contexts/PricingContext';
import { hapticSelect } from '@/utils/haptics';

/** Aviso de error de un paso que no es un campo de texto (categoría, foto, ubicación, equipos). */
export function FieldError({ message }: { message: string }) {
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

/** Abre la galería y devuelve la foto elegida (sin forzar recorte); null si se cancela o no hay permiso. */
export async function pickCoverImage(): Promise<{ uri: string; mime: string } | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets[0]) return null;
  return { uri: result.assets[0].uri, mime: result.assets[0].mimeType ?? 'image/jpeg' };
}

/** Paso «Foto»: área 4:3 con «Añadir foto» o vista previa con «Cambiar» y «Quitar», más consejos cortos. */
export function PhotoStep({ uri, onPick, onRemove, error, tip }: { uri: string | null; onPick: () => void; onRemove: () => void; error: string | null; tip: string }) {
  const colors = useTheme();
  return (
    <View style={{ gap: Rhythm.titleToContent }}>
      {uri ? (
        <>
          <View style={{ aspectRatio: Aspect.card, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: colors.imageBackdrop, borderWidth: 1, borderColor: colors.border }}>
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Button label="Cambiar" icon="swap-horizontal" variant="tonal" size="sm" fullWidth={false} onPress={onPick} />
            <Button label="Quitar" icon="trash-outline" variant="ghost" size="sm" fullWidth={false} onPress={onRemove} />
          </View>
        </>
      ) : (
        <Pressable
          onPress={onPick}
          accessibilityRole="button"
          accessibilityLabel="Añadir foto"
          style={({ pressed }) => ({
            aspectRatio: Aspect.card,
            borderRadius: Radius.card,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: error ? colors.destructive : colors.border,
            backgroundColor: colors.backgroundElement,
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.two,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="camera-outline" size={40} color={colors.primary} />
          <Text variant="bodyStrong" color="primary">
            Añadir foto
          </Text>
        </Pressable>
      )}
      {error ? <FieldError message={error} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }}>
        <Ionicons name="bulb-outline" size={18} color={colors.textSecondary} style={{ marginTop: Spacing.half }} />
        <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
          {tip}
        </Text>
      </View>
    </View>
  );
}

/** Precio grande y centrado: «$» + número (48) + «/día», teclado decimal. Usa el binding de `useForm`. */
export function BigPriceInput({ binding, onChangeText, children }: { binding: FieldBinding; onChangeText: (v: string) => void; children?: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={{ gap: Rhythm.titleToContent, alignItems: 'center' }}>
      <Text variant="bodyStrong" color="textSecondary" style={{ textAlign: 'center' }}>
        Tu precio por día (lo que recibes)
      </Text>
      {/* Centrado vertical (no baseline: el baseline de TextInput no es fiable en iOS y descuadraba «$» y el número). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one }}>
        <Text variant="display" color="textSecondary" style={[WizardType.bigNumber, { includeFontPadding: false }]}>
          $
        </Text>
        <TextInput
          ref={binding.inputRef as RefObject<TextInputInstance | null>}
          value={binding.value}
          onChangeText={onChangeText}
          onBlur={binding.onBlur}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          maxLength={9}
          accessibilityLabel="Tu precio por día en dólares (lo que recibes)"
          accessibilityHint={binding.error ?? undefined}
          aria-invalid={!!binding.error}
          style={[{ minWidth: 72, textAlign: 'center', textAlignVertical: 'center', color: colors.text, fontFamily: 'Inter_700Bold', padding: 0, includeFontPadding: false }, WizardType.bigNumber]}
        />
        <Text variant="subtitle" color="textSecondary">
          /día
        </Text>
      </View>
      {binding.error ? <FieldError message={binding.error} /> : null}
      {children}
    </View>
  );
}

/** Tarjeta de vista previa (la misma proporción 4:3 de las tarjetas): foto, título, líneas y precio. */
export function WizardPreviewCard({ uri, title, lines, price }: { uri: string | null; title: string; lines: string[]; price: string }) {
  const colors = useTheme();
  return (
    <View style={{ borderRadius: Radius.card, overflow: 'hidden', backgroundColor: colors.backgroundElement }}>
      <View style={{ aspectRatio: Aspect.card, backgroundColor: colors.imageBackdrop, alignItems: 'center', justifyContent: 'center' }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Ionicons name="image-outline" size={36} color={colors.textSecondary} />
        )}
      </View>
      <View style={{ padding: Rhythm.cardPadding + Spacing.one, gap: Spacing.one }}>
        <Text variant="subtitle" numberOfLines={2}>
          {title || 'Sin título'}
        </Text>
        {lines.map((line) => (
          <Text key={line} variant="caption" color="textSecondary">
            {line}
          </Text>
        ))}
        <Text variant="headline" style={{ marginTop: Spacing.one }}>
          {price}{' '}
          <Text variant="caption" color="textSecondary">
            /día
          </Text>
        </Text>
      </View>
    </View>
  );
}

export type ReviewItem = { key: string; label: string; value: string; onEdit: () => void };

/** Secciones de la revisión: etiqueta, valor resumido y «Editar» (≥ 44pt). */
export function ReviewSections({ items }: { items: ReviewItem[] }) {
  const colors = useTheme();
  return (
    <View style={{ gap: 0 }}>
      {items.map((item, i) => (
        <View
          key={item.key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            minHeight: MinTouch + Spacing.three,
            paddingVertical: Spacing.two,
            borderTopWidth: i === 0 ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
            <Text variant="caption" color="textSecondary">
              {item.label}
            </Text>
            <Text variant="bodyStrong" numberOfLines={3}>
              {item.value}
            </Text>
          </View>
          <Button label="Editar" variant="tonal" size="sm" fullWidth={false} onPress={item.onEdit} accessibilityLabel={`Editar ${item.label}`} />
        </View>
      ))}
    </View>
  );
}

/** Texto de precio por día para resúmenes («$25.00»); vacío si el valor no es válido. */
export function priceFromInput(raw: string): string {
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? formatPrice(Math.round(n * 100)) : '$0';
}

/** Precio por día que verán los Riders a partir de lo que escribe el Partner («80» → «$92»). */
export function riderPriceFromInput(raw: string, riderPrice: (partnerCents: number) => number): string {
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? formatPrice(riderPrice(Math.round(n * 100))) : '$0';
}

/** «Los Riders verán $92 por día»: ayuda en vivo bajo el precio que escribe el Partner (usa riderPrice de usePricing, sin duplicar la fórmula). */
export function PriceHint({ raw }: { raw: string }) {
  const { riderPrice } = usePricing();
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return (
    <Text variant="bodyStrong" color="primary" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
      Los Riders verán {formatPrice(riderPrice(Math.round(n * 100)))} por día
    </Text>
  );
}

/** Compat: ancho útil para tarjetas de categoría en 2 columnas. */
export function useTwoColumnWidth(): number {
  const { contentWidth, gutter } = useLayout();
  return Math.floor((contentWidth - gutter * 2 - Rhythm.cardGap) / 2);
}

/** Rango de la capacidad de un paquete (personas). */
export const CAPACITY_MIN = 1;
export const CAPACITY_MAX = 500;

/** ¿Es una capacidad válida? (entero entre CAPACITY_MIN y CAPACITY_MAX). */
export function isValidCapacity(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = parseInt(value, 10);
  return n >= CAPACITY_MIN && n <= CAPACITY_MAX;
}

const STEPPER_BUTTON = 56;

/**
 * Control numérico con botones − y +, número grande centrado y escritura directa (teclado numérico, solo
 * dígitos). Todo va en una fila con `alignItems: 'center'`: botones y número comparten el mismo eje vertical.
 * Mínimo y máximo se respetan al pulsar y al escribir (un valor mayor al máximo se ajusta al máximo).
 */
export function NumberStepper({
  binding,
  onChangeText,
  unitSingular,
  unitPlural,
  label,
  min = CAPACITY_MIN,
  max = CAPACITY_MAX,
}: {
  binding: FieldBinding;
  onChangeText: (next: string) => void;
  unitSingular: string;
  unitPlural: string;
  label: string;
  min?: number;
  max?: number;
}) {
  const colors = useTheme();
  const current = /^\d+$/.test(binding.value) ? parseInt(binding.value, 10) : null;
  const canDecrease = current !== null && current > min;
  const canIncrease = current === null || current < max;

  function change(next: number) {
    hapticSelect();
    onChangeText(String(Math.min(max, Math.max(min, next))));
  }

  const buttonStyle = (enabled: boolean) => ({
    width: STEPPER_BUTTON,
    height: STEPPER_BUTTON,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: enabled ? colors.text : colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  });

  return (
    <View style={{ gap: Rhythm.titleToContent, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three }}>
        <Pressable
          onPress={() => canDecrease && change((current ?? min) - 1)}
          disabled={!canDecrease}
          accessibilityRole="button"
          accessibilityLabel={`Disminuir ${label}`}
          accessibilityState={{ disabled: !canDecrease }}
          style={({ pressed }) => [buttonStyle(canDecrease), { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="remove" size={24} color={canDecrease ? colors.text : colors.textMuted} />
        </Pressable>

        <TextInput
          ref={binding.inputRef as RefObject<TextInputInstance | null>}
          value={binding.value}
          onChangeText={(raw) => {
            const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
            if (digits === '') return onChangeText('');
            onChangeText(String(Math.min(max, parseInt(digits, 10))));
          }}
          onBlur={binding.onBlur}
          placeholder={String(min)}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={String(max).length + 1}
          selectTextOnFocus
          accessibilityLabel={label}
          accessibilityHint={binding.error ?? `Entre ${min} y ${max}`}
          aria-invalid={!!binding.error}
          style={[{ minWidth: 96, textAlign: 'center', textAlignVertical: 'center', color: colors.text, fontFamily: 'Inter_700Bold', padding: 0, includeFontPadding: false }, WizardType.bigNumber]}
        />

        <Pressable
          onPress={() => canIncrease && change((current ?? min - 1) + 1)}
          disabled={!canIncrease}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${label}`}
          accessibilityState={{ disabled: !canIncrease }}
          style={({ pressed }) => [buttonStyle(canIncrease), { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="add" size={24} color={canIncrease ? colors.text : colors.textMuted} />
        </Pressable>
      </View>

      <Text variant="body" color="textSecondary">
        {current === 1 ? unitSingular : unitPlural}
      </Text>
      {current === null && !binding.error ? (
        <Text variant="caption" color="textSecondary">
          Elige al menos {min} {unitSingular} para continuar.
        </Text>
      ) : null}
      {binding.error ? <FieldError message={binding.error} /> : null}
    </View>
  );
}
