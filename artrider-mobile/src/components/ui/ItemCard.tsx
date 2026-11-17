import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CATEGORY_LABELS } from '@/constants/categories';
import { Aspect, FavoriteAccent, MinTouch, Radius, Spacing, Type } from '@/constants/theme';
import { useFavorito } from '@/hooks/useFavorito';
import { useTheme } from '@/hooks/use-theme';
import { Badge } from './Badge';
import { Text } from './Text';

/** Datos mínimos para mostrar un equipo o paquete (compatible con HomeCardItem y ExploreItem). */
export type ItemCardData = {
  id: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  daily_price: number;
  city?: string | null;
  rating?: number;
  href: string;
  tipo: 'equipo' | 'paquete';
};

export type ItemCardProps = {
  item: ItemCardData;
  /** Ancho de la tarjeta (carrusel o grilla). El alto de la foto sale de la proporción única 4:3. */
  width: number;
  isFavorito?: boolean;
  /** Muestra el corazón sobre la foto (por defecto true: igual en todas las tarjetas). */
  showFavorite?: boolean;
  /**
   * `contain` (por defecto) para fotos de producto con fondo blanco; `cover` solo para fotos de
   * ambiente. Siempre sobre un fondo neutro con borde sutil.
   */
  imageFit?: 'contain' | 'cover';
};

/** Distancia del badge y del corazón a las esquinas de la foto. */
const CORNER = Spacing.two;
/** Círculo visible del corazón; el área táctil es MinTouch. */
const HEART_VISIBLE = 32;
const TITLE_LINES = 2;
const META_HEIGHT = Type.caption.lineHeight;
const RATING_SLOT = 44;

function ItemCardBase({ item, width, isFavorito = false, showFavorite = true, imageFit = 'contain' }: ItemCardProps) {
  const colors = useTheme();
  const router = useRouter();
  const { esFavorito, toggleFavorito } = useFavorito(item.id, item.tipo, isFavorito);

  const catLabel = item.tipo === 'paquete' ? 'Paquete' : (CATEGORY_LABELS[item.category ?? ''] ?? item.category ?? 'Equipo');
  const price = `$${(item.daily_price / 100).toFixed(0)}`;
  const hasRating = (item.rating ?? 0) > 0;
  const isNew = item.tipo === 'equipo' && !hasRating;
  const imageHeight = Math.round(width / Aspect.card);
  const heartInset = CORNER - (MinTouch - HEART_VISIBLE) / 2;

  return (
    // El corazón es HERMANO del Pressable de navegación (no anidado) y va posicionado en absoluto.
    <View testID="item-card" style={{ width }}>
      <Pressable
        onPress={() => router.push(item.href as never)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${catLabel}${item.city ? `, ${item.city}` : ''}, ${price} por día`}
        style={{ flex: 1 }}
      >
        <View
          style={{
            width,
            height: imageHeight,
            borderRadius: Radius.card,
            overflow: 'hidden',
            backgroundColor: colors.backgroundElement,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {item.cover_image_url ? (
            <Image
              source={{ uri: item.cover_image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit={imageFit}
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={item.id}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
            </View>
          )}
        </View>

        {/* Texto: bloque superior de alto reservado + precio anclado al fondo de la tarjeta. */}
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between', paddingTop: Spacing.two, gap: Spacing.one }}>
          <View style={{ gap: Spacing.half }}>
            <Text variant="overline" color="textMuted" numberOfLines={1}>
              {catLabel}
            </Text>
            <Text variant="bodyStrong" numberOfLines={TITLE_LINES} style={{ minHeight: Type.bodyStrong.lineHeight * TITLE_LINES }}>
              {item.title}
            </Text>
            <View style={{ height: META_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                {item.city ? (
                  <>
                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                    <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {item.city}
                    </Text>
                  </>
                ) : null}
              </View>
              {/* Espacio reservado: el rating siempre ocupa la misma posición, haya o no calificación. */}
              <View style={{ width: RATING_SLOT, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.half }}>
                {hasRating ? (
                  <>
                    <Ionicons name="star" size={12} color={colors.text} />
                    <Text variant="captionStrong">{(item.rating ?? 0).toFixed(1)}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
          <Text testID="item-price" variant="caption" color="textSecondary">
            <Text variant="bodyStrong">{price}</Text> por día
          </Text>
        </View>
      </Pressable>

      {item.tipo === 'paquete' ? (
        <Badge label="Paquete" tone="neutral" style={{ position: 'absolute', left: CORNER, top: CORNER }} />
      ) : isNew ? (
        <Badge label="Nuevo" tone="accent" style={{ position: 'absolute', left: CORNER, top: CORNER }} />
      ) : null}

      {showFavorite ? (
        <Pressable
          onPress={toggleFavorito}
          accessibilityRole="button"
          accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          accessibilityState={{ selected: esFavorito }}
          style={{ position: 'absolute', right: heartInset, top: heartInset, width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            style={{
              width: HEART_VISIBLE,
              height: HEART_VISIBLE,
              borderRadius: Radius.full,
              backgroundColor: colors.onImageSurface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={esFavorito ? 'heart' : 'heart-outline'} size={18} color={esFavorito ? FavoriteAccent : colors.onImage} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export const ItemCard = memo(ItemCardBase);
