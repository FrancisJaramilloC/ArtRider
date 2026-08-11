import { useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollView, RefreshControl, View, TextInput, Pressable, FlatList, Dimensions, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { CityCarousel } from '@/components/home/CityCarousel';
import { ExploreCard } from '@/components/explore/ExploreCard';
import { CartIconButton } from '@/components/cart/CartIconButton';
import { Colors, Spacing, Radius, BottomTabInset } from '@/constants/theme';
import { getHomeData, type HomeData } from '@/services/homeService';
import { getExploreItems, type ExploreItem } from '@/services/exploreService';
import { getUserFavIds } from '@/services/favoritosService';
import { useAuth } from '@/hooks/useAuth';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.four * 2 - Spacing.three) / 2;

export function HomeScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const [data, setData] = useState<HomeData | null>(null);
    const [exploreItems, setExploreItems] = useState<ExploreItem[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');

    // Estado de búsqueda/filtros — cuando cualquiera de esto está activo,
    // se muestra la grilla en vez de los carruseles.
    const [rawQuery, setRawQuery] = useState('');
    const [query, setQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [city, setCity] = useState<string | null>(null);
    const [maxPrice, setMaxPrice] = useState('');

    const load = useCallback(async () => {
        const [homeData, items, favIds] = await Promise.all([
            getHomeData(),
            getExploreItems(),
            isAuthenticated ? getUserFavIds() : Promise.resolve({ equipoIds: [], paqueteIds: [] }),
        ]);
        setData(homeData);
        setExploreItems(items);
        setFavoriteIds(new Set([...favIds.equipoIds, ...favIds.paqueteIds]));
    }, [isAuthenticated]);

    useEffect(() => {
        load().finally(() => setLoading(false));
    }, [load]);

    useEffect(() => {
        const timer = setTimeout(() => setQuery(rawQuery), 300);
        return () => clearTimeout(timer);
    }, [rawQuery]);

    async function onRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    // Modo búsqueda activo: el usuario escribió algo, activó un filtro de
    // ciudad/precio, o simplemente tiene el input enfocado (para que ver
    // los resultados no requiera escribir primero, igual que Airbnb).
    const isSearching = searchFocused || query.trim().length > 0 || city !== null || maxPrice.length > 0;

    const cities = useMemo(() => {
        const set = new Set<string>();
        exploreItems.forEach((item) => item.city && set.add(item.city));
        return Array.from(set).sort();
    }, [exploreItems]);

    const filteredExploreItems = useMemo(() => {
        let list = exploreItems;
        if (activeCategory !== 'all') list = list.filter((item) => item.category === activeCategory);
        if (city) list = list.filter((item) => item.city === city);
        if (query.trim()) {
            const q = query.trim().toLowerCase();
            list = list.filter((item) => item.title.toLowerCase().includes(q) || (item.city ?? '').toLowerCase().includes(q));
        }
        const max = parseFloat(maxPrice);
        if (!isNaN(max) && max > 0) list = list.filter((item) => item.daily_price <= max * 100);
        return list;
    }, [exploreItems, activeCategory, city, query, maxPrice]);

    const filteredCityGroups = useMemo(() => {
        if (!data) return [];
        if (activeCategory === 'all') return data.cityGroups;
        return data.cityGroups
            .map((group) => ({ city: group.city, items: group.items.filter((i) => i.category === activeCategory) }))
            .filter((group) => group.items.length > 0);
    }, [data, activeCategory]);

    const hasActiveFilters = city !== null || rawQuery.length > 0 || maxPrice.length > 0;

    function clearFilters() {
        setRawQuery('');
        setQuery('');
        setCity(null);
        setMaxPrice('');
        setSearchFocused(false);
    }

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text }}>
                        ArtRider
                    </ThemedText>
                    {isAuthenticated && <CartIconButton />}
                </View>

                {/* Barra de búsqueda real — filtra en el mismo Home, nunca navega */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.two,
                        backgroundColor: colors.backgroundElement,
                        borderRadius: 999,
                        paddingHorizontal: Spacing.three,
                    }}
                >
                    <Ionicons name="search" size={18} color={colors.textSecondary} />
                    <TextInput
                        value={rawQuery}
                        onChangeText={setRawQuery}
                        onFocus={() => setSearchFocused(true)}
                        placeholder="¿Qué equipo o paquete buscas?"
                        placeholderTextColor={colors.textSecondary}
                        style={{ flex: 1, paddingVertical: 13, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.text }}
                    />
                    {isSearching && (
                        <Pressable
                            onPress={() => {
                                clearFilters();
                            }}
                            hitSlop={8}
                        >
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>
            </View>

            <CategoryStrip activeCategory={activeCategory} onSelect={setActiveCategory} />

            {isSearching ? (
                <>
                    {/* Ciudad + precio — mismos filtros que antes tenía Explorar */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two, alignItems: 'center' }}
                    >
                        {cities.map((c) => {
                            const isActive = city === c;
                            return (
                                <Pressable
                                    key={c}
                                    onPress={() => setCity(isActive ? null : c)}
                                    style={{
                                        paddingHorizontal: Spacing.three,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        backgroundColor: isActive ? colors.backgroundSelected : 'transparent',
                                        borderWidth: 1,
                                        borderColor: isActive ? colors.primary : colors.border,
                                    }}
                                >
                                    <ThemedText style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: isActive ? colors.primary : colors.textSecondary }}>
                                        {c}
                                    </ThemedText>
                                </Pressable>
                            );
                        })}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 999,
                                paddingHorizontal: Spacing.three,
                                paddingVertical: 4,
                            }}
                        >
                            <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Hasta $</ThemedText>
                            <TextInput
                                value={maxPrice}
                                onChangeText={setMaxPrice}
                                placeholder="400"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                style={{ width: 40, fontSize: 12, color: colors.text, padding: 0 }}
                            />
                        </View>
                        {hasActiveFilters && (
                            <Pressable onPress={clearFilters}>
                                <ThemedText style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.destructive, textDecorationLine: 'underline' }}>
                                    Limpiar filtros
                                </ThemedText>
                            </Pressable>
                        )}
                    </ScrollView>

                    {filteredExploreItems.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.five }}>
                            <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                                No hay equipos ni paquetes con estos filtros.
                            </ThemedText>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredExploreItems}
                            keyExtractor={(item) => item.id}
                            numColumns={2}
                            columnWrapperStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}
                            contentContainerStyle={{ gap: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six }}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => <ExploreCard item={item} width={CARD_WIDTH} />}
                        />
                    )}

                    <Pressable
                        onPress={() =>
                            router.push({
                                pathname: '/map',
                                params: { category: activeCategory, city: city ?? '', query, maxPrice },
                            } as any)
                        }
                        style={{
                            position: 'absolute',
                            bottom: BottomTabInset + Spacing.three,
                            alignSelf: 'center',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: '#111',
                            paddingHorizontal: Spacing.four,
                            paddingVertical: Spacing.three,
                            borderRadius: 999,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 6,
                        }}
                    >
                        <Ionicons name="map" size={16} color="#fff" />
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' }}>Mapa</ThemedText>
                    </Pressable>
                </>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    keyboardShouldPersistTaps="handled"
                >
                    {filteredCityGroups.map((group) => (
                        <CityCarousel
                            key={group.city}
                            title={`Equipos populares en ${group.city}`}
                            items={group.items}
                            favoriteIds={favoriteIds}
                            onSeeMore={() => {
                                setCity(group.city);
                                setSearchFocused(true);
                            }}
                        />
                    ))}

                    {activeCategory === 'all' && data && data.packages.length > 0 && (
                        <CityCarousel
                            title="Paquetes destacados"
                            subtitle="Combos listos para rentar que ahorran dinero y tiempo"
                            items={data.packages}
                            favoriteIds={favoriteIds}
                        />
                    )}

                    {filteredCityGroups.length === 0 && (!(activeCategory === 'all' && data && data.packages.length > 0)) && (
                        <View style={{ paddingHorizontal: Spacing.five, paddingTop: Spacing.six, alignItems: 'center' }}>
                            <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                                No hay equipos en esta categoría todavía.
                            </ThemedText>
                        </View>
                    )}

                    <View style={{ height: Spacing.six }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}