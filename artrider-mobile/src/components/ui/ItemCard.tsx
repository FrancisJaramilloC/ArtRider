import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CATEGORY_LABELS } from '@/constants/categories';
import { Aspect, FavoriteAccent, MinTouch, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
};

function ItemCardBase({ item, width, isFavorito = false, showFavorite = true }: ItemCardProps) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { esFavorito, toggleFavorito } = useFavorito(item.id, item.tipo, isFavorito);

  const catLabel = item.tipo === 'paquete' ? 'Paquete' : (CATEGORY_LABELS[item.category ?? ''] ?? item.category ?? 'Equipo');
  const price = `$${(item.daily_price / 100).toFixed(0)}`;
  const hasRating = (item.rating ?? 0) > 0;
  const isNew = item.tipo === 'equipo' && !hasRating;
  const imageHeight = Math.round(width / Aspect.card);

  return (
    <Pressable
      onPress={() => router.push(item.href as never)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${catLabel}${item.city ? `, ${item.city}` : ''}, ${price} por día`}
      style={{ width }}
    >
      <View
        style={[
          { width, height: imageHeight, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: colors.backgroundSelected },
          scheme === 'dark' ? { borderWidth: 1, borderColor: colors.border } : Shadows.card,
        ]}
      >
        {item.cover_image_url ? (
          <Image
            source={{ uri: item.cover_image_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
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

        {item.tipo === 'paquete' ? (
          <Badge label="Paquete" tone="neutral" style={{ position: 'absolute', left: Spacing.two, top: Spacing.two }} />
        ) : isNew ? (
          <Badge label="Nuevo" tone="accent" style={{ position: 'absolute', left: Spacing.two, top: Spacing.two }} />
        ) : null}

        {showFavorite ? (
          <Pressable
            onPress={toggleFavorito}
            accessibilityRole="button"
            accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            accessibilityState={{ selected: esFavorito }}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: MinTouch,
              height: MinTouch,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
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

      <View style={{ paddingTop: Spacing.two, gap: 2 }}>
        <Text variant="overline" color="textMuted" numberOfLines={1}>
          {catLabel}
        </Text>
        <Text variant="bodyStrong" numberOfLines={2}>
          {item.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          {item.city ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                {item.city}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {hasRating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <Ionicons name="star" size={12} color={colors.text} />
              <Text variant="captionStrong">{(item.rating ?? 0).toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
          <Text variant="bodyStrong">{price}</Text> por día
        </Text>
      </View>
    </Pressable>
  );
}

export const ItemCard = memo(ItemCardBase);
