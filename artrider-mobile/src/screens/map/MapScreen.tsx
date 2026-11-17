import { useCallback, useMemo, useRef, useState } from 'react';
import { cityKey } from '@/utils/city';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, type LatLng, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { PricePin } from '@/components/map/PricePin';
import { MapPreviewCard } from '@/components/map/MapPreviewCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getListings, type Listing } from '@/services/catalogService';

/** Loja: vista por defecto cuando no hay resultados con coordenadas (nunca el globo). */
const DEFAULT_REGION: Region = {
  latitude: -3.9931,
  longitude: -79.2042,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/** Aire alrededor de los pines al encuadrarlos: arriba los botones «Lista»/contador, abajo la tarjeta de vista previa. */
const FIT_EDGE_PADDING = { top: 120, right: 56, bottom: 200, left: 56 };
/** Zoom mínimo (en grados) cuando los pines están casi en el mismo punto. */
const MIN_DELTA = 0.02;

/** Región que contiene todos los puntos (con margen); Loja por defecto si no hay ninguno. */
function regionFor(points: LatLng[]): Region {
  if (points.length === 0) return DEFAULT_REGION;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, MIN_DELTA),
  };
}

export function MapScreen() {
  const { gutter } = useLayout();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; city?: string; query?: string; maxPrice?: string }>();

  const { data, status, error, reload } = useAsyncData<Listing[]>(getListings);
  const listings = useMemo(() => data ?? [], [data]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const loading = status === 'loading';

  const filtered = useMemo(() => {
    let list = listings;
    if (params.category && params.category !== 'all') {
      list = list.filter((l) => l.category === params.category);
    }
    if (params.city) {
      const wanted = cityKey(params.city);
      list = list.filter((l) => !!l.address?.city && cityKey(l.address.city) === wanted);
    }
    if (params.query) {
      const q = params.query.toLowerCase();
      list = list.filter((l) => (l.title ?? '').toLowerCase().includes(q));
    }
    if (params.maxPrice) {
      const max = parseFloat(params.maxPrice);
      if (!isNaN(max)) list = list.filter((l) => l.daily_price <= max * 100);
    }
    return list;
  }, [listings, params]);

  const withCoords = useMemo(() => filtered.filter((l) => l.address?.latitude != null && l.address?.longitude != null), [filtered]);
  const coordinates = useMemo<LatLng[]>(() => withCoords.map((l) => ({ latitude: l.address!.latitude, longitude: l.address!.longitude })), [withCoords]);
  // Región inicial calculada con los pines: el mapa nunca arranca en el mundo.
  const initialRegion = useMemo(() => regionFor(coordinates), [coordinates]);

  const mapRef = useRef<{ fitToCoordinates?: (coords: LatLng[], options?: { edgePadding?: typeof FIT_EDGE_PADDING; animated?: boolean }) => void } | null>(null);
  const fitPins = useCallback(() => {
    // Con un solo pin la región inicial ya lo centra; fitToCoordinates lo acercaría demasiado.
    if (coordinates.length > 1) mapRef.current?.fitToCoordinates?.(coordinates, { edgePadding: FIT_EDGE_PADDING, animated: false });
  }, [coordinates]);

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ErrorState error={error} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ClusteredMapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        mapRef={(ref) => {
          mapRef.current = ref as unknown as typeof mapRef.current;
        }}
        onMapReady={fitPins}
        onPress={(e) => {
          // El toque en un marcador también dispara este onPress del mapa
          // de fondo — hay que ignorarlo en ese caso, o el card se cierra
          // en el mismo instante en que se abre.
          if (e.nativeEvent.action === 'marker-press') return;
          setSelected(null);
        }}
        clusterColor={colors.primary}
        clusterTextColor={colors.onPrimary}
      >
        {withCoords.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{ latitude: listing.address!.latitude, longitude: listing.address!.longitude }}
            onPress={() => setSelected(listing)}
            tracksViewChanges={selected?.id === listing.id}
          >
            <PricePin price={listing.daily_price} isSelected={selected?.id === listing.id} />
          </Marker>
        ))}
      </ClusteredMapView>

      {/* Botón "Lista" para volver — mismo patrón que "Mapa" en Explorar */}
      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: gutter, paddingTop: Spacing.two }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.two,
              backgroundColor: colors.primary,
              paddingHorizontal: Spacing.three,
              paddingVertical: Spacing.two,
              borderRadius: 999,
            }}
          >
            <Ionicons name="list" size={16} color={colors.onPrimary} />
            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onPrimary }}>Lista</ThemedText>
          </Pressable>

          <View
            style={{
              backgroundColor: colors.onImageSurface,
              paddingHorizontal: Spacing.three,
              paddingVertical: Spacing.two,
              borderRadius: 999,
            }}
          >
            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onImage }}>
              {withCoords.length} {withCoords.length === 1 ? 'equipo' : 'equipos'}
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>

      {selected && <MapPreviewCard listing={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}