import { useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollView, RefreshControl, View, TextInput, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CategoryStrip } from '@/components/home/CategoryStrip';
import { CityCarousel } from '@/components/home/CityCarousel';
import { CartIconButton } from '@/components/cart/CartIconButton';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemCard } from '@/components/ui/ItemCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { ItemCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Fonts, MinTouch, Radius, Shadows, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getHomeData, type HomeData } from '@/services/homeService';
import { getExploreItems, type ExploreItem } from '@/services/exploreService';
import { getUserFavIds } from '@/services/favoritosService';
import { useAuth } from '@/hooks/useAuth';
import { cityKey } from '@/utils/city';

/** Cuántas tarjetas de esqueleto se muestran mientras carga (2 filas de la grilla). */
const SKELETON_ROWS = 2;

export function HomeScreen() {
    const colors = useTheme();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { gutter, columns, cardWidth, bottomInset } = useLayout();

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
        if (city) list = list.filter((item) => item.city !== null && cityKey(item.city) === cityKey(city));
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
    const showPackages = activeCategory === 'all' && !!data && data.packages.length > 0;

    function clearFilters() {
        setRawQuery('');
        setQuery('');
        setCity(null);
        setMaxPrice('');
        setSearchFocused(false);
    }

    const header = (
        <View style={{ paddingHorizontal: gutter, paddingTop: Spacing.three, gap: Spacing.three }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="title" accessibilityRole="header">
                    ArtRider
                </Text>
                {isAuthenticated && <CartIconButton />}
            </View>

            {/* Barra de búsqueda real — filtra en el mismo Home, nunca navega */}
            <SearchBar
                value={rawQuery}
                onChangeText={setRawQuery}
                onFocus={() => setSearchFocused(true)}
                placeholder="¿Qué equipo o paquete buscas?"
                onClear={clearFilters}
                showClear={isSearching}
            />
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
                {header}
                <View style={{ flexDirection: 'row', gap: Spacing.two, paddingHorizontal: gutter, paddingVertical: Spacing.three }}>
                    {[88, 104, 96, 80].map((w, i) => (
                        <Skeleton key={i} width={w} height={40} radius={Radius.full} />
                    ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, paddingHorizontal: gutter, paddingTop: Spacing.two }}>
                    {Array.from({ length: columns * SKELETON_ROWS }).map((_, i) => (
                        <ItemCardSkeleton key={i} width={cardWidth()} />
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            {header}

            <CategoryStrip activeCategory={activeCategory} onSelect={setActiveCategory} gutter={gutter} />

            {isSearching ? (
                <>
                    {/* Ciudad + precio — mismos filtros que antes tenía Explorar */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flexGrow: 0 }}
                        contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: gutter, paddingBottom: Spacing.two, alignItems: 'center' }}
                    >
                        {cities.map((c) => (
                            <Chip key={c} label={c} active={city !== null && cityKey(city) === cityKey(c)} onPress={() => setCity(city !== null && cityKey(city) === cityKey(c) ? null : c)} />
                        ))}
                        <View
                            style={{
                                height: 40,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: Spacing.one,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: Radius.full,
                                paddingHorizontal: Spacing.three,
                            }}
                        >
                            <Text variant="captionStrong" color="textSecondary">
                                Hasta $
                            </Text>
                            <TextInput
                                value={maxPrice}
                                onChangeText={setMaxPrice}
                                placeholder="400"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                                accessibilityLabel="Precio máximo por día"
                                maxFontSizeMultiplier={1.2}
                                style={{ minWidth: 44, fontSize: 13, fontFamily: Fonts.sansSemiBold, color: colors.text, padding: 0 }}
                            />
                        </View>
                        {hasActiveFilters && (
                            <Pressable
                                onPress={clearFilters}
                                accessibilityRole="button"
                                accessibilityLabel="Limpiar filtros"
                                style={{ minHeight: MinTouch, justifyContent: 'center', paddingHorizontal: Spacing.two }}
                            >
                                <Text variant="captionStrong" color="destructive" style={{ textDecorationLine: 'underline' }}>
                                    Limpiar filtros
                                </Text>
                            </Pressable>
                        )}
                    </ScrollView>

                    {filteredExploreItems.length === 0 ? (
                        <EmptyState
                            icon="search-outline"
                            title="Sin resultados"
                            description="No hay equipos ni paquetes con estos filtros."
                            actionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
                            onAction={hasActiveFilters ? clearFilters : undefined}
                            style={{ flex: 1 }}
                        />
                    ) : (
                        <FlatList
                            key={columns}
                            data={filteredExploreItems}
                            keyExtractor={(item) => `${item.tipo}-${item.id}`}
                            numColumns={columns}
                            columnWrapperStyle={{ gap: Spacing.three, paddingHorizontal: gutter }}
                            contentContainerStyle={{ gap: Spacing.four, paddingTop: Spacing.two, paddingBottom: bottomInset + MinTouch + Spacing.four }}
                            keyboardShouldPersistTaps="handled"
                            contentInsetAdjustmentBehavior="automatic"
                            renderItem={({ item }) => <ItemCard item={item} width={cardWidth()} isFavorito={favoriteIds.has(item.id)} />}
                        />
                    )}

                    <Pressable
                        onPress={() =>
                            router.push({
                                pathname: '/map',
                                params: { category: activeCategory, city: city ?? '', query, maxPrice },
                            } as never)
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Ver en el mapa"
                        style={[
                            {
                                position: 'absolute',
                                bottom: bottomInset,
                                alignSelf: 'center',
                                minHeight: MinTouch,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: Spacing.two,
                                backgroundColor: colors.primary,
                                paddingHorizontal: Spacing.four,
                                borderRadius: Radius.full,
                            },
                            Shadows.floating,
                        ]}
                    >
                        <Ionicons name="map" size={18} color={colors.onPrimary} />
                        <Text variant="button" style={{ color: colors.onPrimary, fontSize: 14 }}>
                            Mapa
                        </Text>
                    </Pressable>
                </>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    keyboardShouldPersistTaps="handled"
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: bottomInset + Spacing.four }}
                >
                    {filteredCityGroups.map((group) => (
                        <CityCarousel
                            key={cityKey(group.city)}
                            title={`Equipos populares en ${group.city}`}
                            items={group.items}
                            favoriteIds={favoriteIds}
                            onSeeMore={() => {
                                setCity(group.city);
                                setSearchFocused(true);
                            }}
                        />
                    ))}

                    {showPackages && data && (
                        <CityCarousel
                            title="Paquetes destacados"
                            subtitle="Combos listos para rentar que ahorran dinero y tiempo"
                            items={data.packages}
                            favoriteIds={favoriteIds}
                        />
                    )}

                    {filteredCityGroups.length === 0 && !showPackages && (
                        <EmptyState
                            icon="albums-outline"
                            title="Aún no hay equipos aquí"
                            description="No hay equipos en esta categoría todavía."
                            style={{ paddingTop: Spacing.six }}
                        />
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
