import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/format';

/** Hoja de contenido con esquinas superiores redondeadas que sube sobre la foto. */
export function DetailSheet({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const { gutter, contentWidth } = useLayout();
  return (
    <View
      style={{
        marginTop: -Radius.sheet,
        borderTopLeftRadius: Radius.sheet,
        borderTopRightRadius: Radius.sheet,
        backgroundColor: colors.background,
        paddingTop: Spacing.four,
        paddingHorizontal: gutter,
        width: '100%',
        maxWidth: contentWidth,
        alignSelf: 'center',
      }}
    >
      {children}
    </View>
  );
}

/** Sección con línea divisoria superior y título opcional. */
export function DetailSection({ title, children }: { title?: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={{ paddingVertical: Spacing.four, borderTopWidth: 1, borderColor: colors.border, gap: Spacing.three }}>
      {title ? (
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Fila «Ofrecido por …» que abre el chat con el proveedor. */
export function ProviderRow({ brandName, onPress }: { brandName: string | null | undefined; onPress: () => void }) {
  const colors = useTheme();
  const name = brandName ?? 'Proveedor ArtRider';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ofrecido por ${name}. Enviar mensaje`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56 }}
    >
      <Avatar name={name} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          Ofrecido por {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text variant="caption" color="textSecondary">
            Proveedor verificado
          </Text>
        </View>
      </View>
      <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
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
    <DetailSection>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {rating > 0 && <Ionicons name="star" size={18} color={colors.text} />}
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
      </View>

      {reviews.length === 0 ? (
        <Text variant="body" color="textSecondary">
          {emptyText}
        </Text>
      ) : (
        reviews.map((review) => (
          <View key={review.id} style={{ gap: Spacing.two }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Avatar name={review.author_name} size={36} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {review.author_name}
                </Text>
                <Text variant="caption" color="textMuted">
                  {formatRelativeTime(review.created_at)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${review.rating} de 5 estrellas`} accessible>
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
              <Text variant="body" color="textSecondary">
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
  onChat: () => void;
  chatLoading?: boolean;
  onAddToCart: () => void;
  onReserve: () => void;
};

/** Barra inferior fija: chat, carrito, precio por día y botón «Reservar» (respeta safe area). */
export function DetailBottomBar({ priceLabel, onChat, chatLoading, onAddToCart, onReserve }: DetailBottomBarProps) {
  const colors = useTheme();
  const { gutter, insets, isCompact } = useLayout();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingTop: Spacing.three,
        paddingBottom: Math.max(insets.bottom, Spacing.three),
        paddingHorizontal: gutter - 2,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderColor: colors.border,
      }}
    >
      <IconButton icon="chatbubble-ellipses-outline" label="Contactar al proveedor" variant="outline" onPress={onChat} loading={chatLoading} />
      <IconButton icon="cart-outline" label="Agregar al carrito" variant="outline" onPress={onAddToCart} />
      <View style={{ flex: 1, paddingLeft: Spacing.one }}>
        <Text variant="headline" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {priceLabel}
        </Text>
        <Text variant="caption" color="textSecondary">
          por día
        </Text>
      </View>
      <Button label="Reservar" onPress={onReserve} fullWidth={false} style={{ paddingHorizontal: isCompact ? Spacing.three : Spacing.four }} />
    </View>
  );
}
