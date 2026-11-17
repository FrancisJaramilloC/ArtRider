import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COPY } from '@/constants/copy';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ItemCard, type ItemCardData } from '@/components/ui/ItemCard';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Rhythm, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/format';

/** Columna de contenido: margen lateral = Gutter y ancho máximo en tablet (la foto va a sangre arriba). */
export function DetailSheet({ children }: { children: ReactNode }) {
  const { gutter, contentWidth } = useLayout();
  return (
    <View style={{ paddingTop: Spacing.four, paddingHorizontal: gutter, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}>
      {children}
    </View>
  );
}

/**
 * Sección: 32 sobre ella (Rhythm.section), 12 entre título y contenido. `divider` añade un separador
 * fino arriba (solo entre bloques grandes).
 */
export function DetailSection({ title, children, divider = false }: { title?: string; children: ReactNode; divider?: boolean }) {
  const colors = useTheme();
  return (
    <View
      style={{
        marginTop: Rhythm.section,
        paddingTop: divider ? Rhythm.section : 0,
        borderTopWidth: divider ? 1 : 0,
        borderColor: colors.border,
        gap: Rhythm.titleToContent,
      }}
    >
      {title ? (
        <Text variant='headline' accessibilityRole='header'>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Ficha del Partner (avatar, nombre, insignia y ciudad). Aún no existe perfil público: toca para escribirle. */
export function ProviderRow({ brandName, city, onPress }: { brandName: string | null | undefined; city?: string | null; onPress: () => void }) {
  const colors = useTheme();
  const name = brandName ?? COPY.providerFallbackName;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={`${COPY.providerLabel(name)}. ${COPY.providerVerified}${city ? `, ${city}` : ''}. Enviar mensaje`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56 }}
    >
      <Avatar name={name} size={48} />
      <View style={{ flex: 1, gap: Spacing.half }}>
        <Text variant='bodyStrong' numberOfLines={1}>
          {COPY.providerLabel(name)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
          <Ionicons name='shield-checkmark' size={14} color={colors.primary} />
          <Text variant='caption' color='textSecondary'>
            {COPY.providerVerified}
          </Text>
        </View>
        {city ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
            <Ionicons name='location-outline' size={14} color={colors.textSecondary} />
            <Text variant='caption' color='textSecondary' numberOfLines={1} style={{ flexShrink: 1 }}>
              {city}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name='chatbubble-ellipses-outline' size={22} color={colors.primary} />
    </Pressable>
  );
}

/** Fila de datos rápidos (calificación, ciudad, capacidad…). */
export function MetaRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.three, rowGap: Spacing.one }}>{children}</View>;
}

export function MetaItem({ icon, label, strong = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; strong?: boolean }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
      <Ionicons name={icon} size={15} color={strong ? colors.text : colors.textSecondary} />
      <Text variant={strong ? 'captionStrong' : 'caption'} color={strong ? 'text' : 'textSecondary'}>
        {label}
      </Text>
    </View>
  );
}

export type ReviewData = {
  id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

/** Cabecera de calificación + lista de reseñas con estado vacío. */
export function ReviewList({ rating, reviews, emptyText }: { rating: number; reviews: ReviewData[]; emptyText: string }) {
  const colors = useTheme();
  const title =
    rating > 0 ? `${rating.toFixed(2)} · ${reviews.length} ${reviews.length === 1 ? 'reseña' : 'reseñas'}` : 'Reseñas';

  return (
    <DetailSection divider>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        {rating > 0 && <Ionicons name='star' size={18} color={colors.text} />}
        <Text variant='headline' accessibilityRole='header'>
          {title}
        </Text>
      </View>

      {reviews.length === 0 ? (
        <Text variant='body' color='textSecondary'>
          {emptyText}
        </Text>
      ) : (
        reviews.map((review) => (
          <View key={review.id} style={{ gap: Spacing.two }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Avatar name={review.author_name} size={36} />
              <View style={{ flex: 1 }}>
                <Text variant='bodyStrong' numberOfLines={1}>
                  {review.author_name}
                </Text>
                <Text variant='caption' color='textMuted'>
                  {formatRelativeTime(review.created_at)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.half }} accessibilityLabel={`${review.rating} de 5 estrellas`} accessible>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= review.rating ? 'star' : 'star-outline'}
                  size={14}
                  color={n <= review.rating ? colors.primary : colors.textMuted}
                />
              ))}
            </View>
            {review.comment ? (
              <Text variant='body' color='textSecondary'>
                {review.comment}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </DetailSection>
  );
}

export type DetailBottomBarProps = {
  priceLabel: string;
  /** Estado del carrito para este ítem: define el texto y la acción del botón principal. */
  cartState: 'idle' | 'in-cart';
  /** Muestra «Agregado al carrito» unos segundos tras agregar. */
  justAdded?: boolean;
  onCartPress: () => void;
  onReserve: () => void;
  /** Si existe, no se puede reservar ni agregar (p. ej. es tu propio equipo): se explica en vez de mostrar botones. */
  disabledReason?: string;
};

/**
 * Barra inferior fija (StickyFooter, respeta safe area): precio por día a la izquierda y UN botón
 * principal a la derecha («Agregar al carrito» / «Ver carrito»); «Reservar» queda como acción secundaria.
 */
export function DetailBottomBar({ priceLabel, cartState, justAdded = false, onCartPress, onReserve, disabledReason }: DetailBottomBarProps) {
  const colors = useTheme();
  const inCart = cartState === 'in-cart';
  return (
    <StickyFooter>
      {justAdded ? (
        <View accessibilityRole='alert' accessibilityLiveRegion='polite' style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
          <Ionicons name='checkmark-circle' size={18} color={colors.primary} />
          <Text variant='captionStrong' color='primary'>
            Agregado al carrito
          </Text>
        </View>
      ) : null}
      {disabledReason ? (
        <Text variant='caption' color='textSecondary'>
          {disabledReason}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <View style={{ flexShrink: 1, minWidth: 64 }}>
          <Text variant='headline' numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {priceLabel}
          </Text>
          <Text variant='caption' color='textSecondary'>
            por día
          </Text>
        </View>
        {disabledReason ? null : (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.one }}>
            <Button label='Reservar' variant='ghost' size='sm' onPress={onReserve} />
            <Button
              label={inCart ? 'En tu carrito · Ver carrito' : 'Agregar al carrito'}
              variant='primary'
              size='md'
              fullWidth={false}
              icon={inCart ? 'cart' : 'cart-outline'}
              onPress={onCartPress}
              style={{ flexShrink: 1 }}
            />
          </View>
        )}
      </View>
    </StickyFooter>
  );
}

/** Texto largo que se colapsa a 4 líneas con «Leer más» (solo si de verdad se corta). */
export function ExpandableText({ text, lines = 4 }: { text: string; lines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [lineCount, setLineCount] = useState<number | null>(null);
  const overflow = lineCount !== null && lineCount > lines;
  return (
    <View style={{ gap: Spacing.one, alignItems: 'flex-start' }}>
      <Text
        variant='body'
        color='textSecondary'
        numberOfLines={expanded || lineCount === null ? undefined : lines}
        onTextLayout={(e) => {
          if (lineCount === null) setLineCount(e.nativeEvent.lines.length);
        }}
      >
        {text}
      </Text>
      {overflow ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole='button'
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Leer menos' : 'Leer más'}
          style={{ minHeight: MinTouch, justifyContent: 'center' }}
        >
          <Text variant='bodyStrong' color='primary'>
            {expanded ? 'Leer menos' : 'Leer más'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export type SpecItem = { label: string; value: string };
/** Valores más largos que esto ocupan el ancho completo para no cortarse. */
const SPEC_LONG_VALUE = 18;

/** Tarjetas de especificaciones en 2 columnas con alturas iguales por fila; los valores largos ocupan toda la fila. */
export function SpecGrid({ items }: { items: SpecItem[] }) {
  const colors = useTheme();
  const { contentWidth, gutter } = useLayout();
  const half = Math.floor((contentWidth - gutter * 2 - Rhythm.cardGap) / 2);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Rhythm.cardGap }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{ width: item.value.length > SPEC_LONG_VALUE ? '100%' : half, backgroundColor: colors.backgroundElement, borderRadius: Radius.xl, padding: Rhythm.cardPadding + Spacing.one, gap: Spacing.half }}
        >
          <Text variant='caption' color='textSecondary'>
            {item.label}
          </Text>
          <Text variant='bodyStrong'>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Carrusel horizontal de tarjetas: 2 completas + ~15 % de la tercera (3 en tablet). */
export function ItemCarousel({ items, favoriteIds }: { items: ItemCardData[]; favoriteIds?: Set<string> }) {
  const { gutter, carouselCardWidth } = useLayout();
  return (
    <FlatList
      data={items}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => `${item.tipo}-${item.id}`}
      style={{ marginHorizontal: -gutter }}
      contentContainerStyle={{ paddingHorizontal: gutter, gap: Rhythm.cardGap }}
      renderItem={({ item }) => <ItemCard item={item} width={carouselCardWidth} isFavorito={favoriteIds?.has(item.id) ?? false} />}
    />
  );
}
