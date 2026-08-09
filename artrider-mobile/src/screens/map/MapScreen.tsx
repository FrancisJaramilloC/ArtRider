import { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Pressable, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { PricePin } from '@/components/map/PricePin';
import { MapPreviewCard } from '@/components/map/MapPreviewCard';
import { getListings, type Listing } from '@/services/catalogService';

const DEFAULT_REGION = {
  latitude: -3.99313,
  longitude: -79.20422,
  latitudeDelta: 4,
  longitudeDelta: 4,
};

export function MapScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; city?: string; query?: string; maxPrice?: string }>();

  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getListings().then(setListings).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = listings;
    if (params.category && params.category !== 'all') {
      list = list.filter((l) => l.category === params.category);
    }
    if (params.city) {
      list = list.filter((l) => l.address?.city === params.city);
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

  const withCoords = filtered.filter((l) => l.address?.latitude != null && l.address?.longitude != null);

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
        initialRegion={DEFAULT_REGION}
        onPress={(e) => {
          // El toque en un marcador también dispara este onPress del mapa
          // de fondo — hay que ignorarlo en ese caso, o el card se cierra
          // en el mismo instante en que se abre.
          if (e.nativeEvent.action === 'marker-press') return;
          setSelected(null);
        }}
        clusterColor={colors.primary}
        clusterTextColor="#fff"
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.two }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#111',
              paddingHorizontal: Spacing.three,
              paddingVertical: Spacing.two,
              borderRadius: 999,
            }}
          >
            <Ionicons name="list" size={16} color="#fff" />
            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' }}>Lista</ThemedText>
          </Pressable>

          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              paddingHorizontal: Spacing.three,
              paddingVertical: Spacing.two,
              borderRadius: 999,
            }}
          >
            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' }}>
              {withCoords.length} {withCoords.length === 1 ? 'equipo' : 'equipos'}
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>

      {selected && <MapPreviewCard listing={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}