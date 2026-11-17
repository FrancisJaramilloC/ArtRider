import { useEffect } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { ItemCard, type ItemCardData } from '@/components/ui/ItemCard';
import { ItemCardSkeleton } from '@/components/ui/Skeleton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Rhythm } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getFavoritosEquipos, getFavoritosPaquetes } from '@/services/favoritosService';
import { onFavoriteChange } from '@/utils/favoritesSync';

const SKELETON_COUNT = 4;

async function loadFavorites(): Promise<ItemCardData[]> {
  const [equipos, paquetes] = await Promise.all([getFavoritosEquipos(), getFavoritosPaquetes()]);
  const equipoCards: ItemCardData[] = equipos.map((l: any) => ({
    id: l.id,
    title: l.title ?? 'Equipo sin título',
    category: l.category ?? null,
    cover_image_url: l.cover_image_url ?? null,
    daily_price: l.daily_price,
    city: l.city,
    href: `/listing/${l.id}`,
    tipo: 'equipo',
  }));
  const paqueteCards: ItemCardData[] = paquetes.map((p: any) => ({
    id: p.id,
    title: p.title,
    category: null,
    cover_image_url: p.cover_image_url ?? null,
    daily_price: p.daily_price,
    href: `/package/${p.id}`,
    tipo: 'paquete',
  }));
  return [...equipoCards, ...paqueteCards];
}

/** Lista de favoritos (equipos y paquetes) con la misma tarjeta que el Home. Ruta apilada, sin pestaña. */
export function FavoritesScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { gutter, columns, cardWidth } = useLayout();

  const { status, data, error, refreshError, refreshing, reload, refresh, setData } = useAsyncData<ItemCardData[]>(loadFavorites, {
    isEmpty: (items) => items.length === 0,
    reloadOnFocus: true,
  });

  // Quitar el corazón (aquí o en otra pantalla) saca la tarjeta al instante, sin recargar la lista.
  useEffect(
    () =>
      onFavoriteChange((c) => {
        if (!c.esFavorito) setData((prev) => (prev ?? []).filter((i) => !(i.id === c.id && i.tipo === c.tipo)));
      }),
    [setData],
  );

  const width = cardWidth();
  const items = data ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Favoritos" />
      {status === 'error' ? (
        <ErrorState fill error={error} onRetry={reload} />
      ) : status === 'loading' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Rhythm.cardGap, paddingHorizontal: gutter, paddingTop: Rhythm.titleToContent }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <ItemCardSkeleton key={i} width={width} />
          ))}
        </View>
      ) : status === 'empty' ? (
        <EmptyState
          icon="heart-outline"
          title="Aún no tienes favoritos"
          description="Toca el corazón de un equipo o paquete para guardarlo aquí."
          actionLabel="Explorar"
          onAction={() => router.replace('/')}
        />
      ) : (
        <FlatList
          key={columns}
          data={items}
          numColumns={columns}
          keyExtractor={(item) => `${item.tipo}-${item.id}`}
          columnWrapperStyle={columns > 1 ? { gap: Rhythm.cardGap } : undefined}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Rhythm.titleToContent, paddingBottom: Rhythm.section, gap: Rhythm.section - Rhythm.cardGap }}
          ListHeaderComponent={refreshError ? <RefreshErrorNotice error={refreshError} onRetry={reload} /> : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => <ItemCard item={item} width={width} isFavorito />}
        />
      )}
    </SafeAreaView>
  );
}
