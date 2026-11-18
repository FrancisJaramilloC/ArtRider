import { useEffect, useMemo, useState } from 'react';
import { ScrollView, RefreshControl, View, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CategoryStrip } from '@/components/home/CategoryStrip';
import { CityCarousel } from '@/components/home/CityCarousel';
import { SearchFilterBar, type ActiveFilter } from '@/components/home/SearchFilterBar';
import { SearchFiltersSheet } from '@/components/home/SearchFiltersSheet';
import { CartIconButton } from '@/components/cart/CartIconButton';
import { FavoritesIconButton } from '@/components/cart/FavoritesIconButton';
import { Button } from '@/components/ui/Button';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemCard } from '@/components/ui/ItemCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { TabScreen } from '@/components/ui/TabScreen';
import { ItemCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Rhythm, Shadows, Spacing } from '@/constants/theme';
import { usePricing } from '@/contexts/PricingContext';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getHomeData, type HomeData } from '@/services/homeService';
import { getExploreItems, type ExploreItem } from '@/services/exploreService';
import { getUserFavIds } from '@/services/favoritosService';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORY_LABELS } from '@/constants/categories';
import { cityKey } from '@/utils/city';

/** Separación entre el botón «Mapa» y la barra inferior de vidrio. */
const MAP_BUTTON_GAP = 12;
/** Espacio que ocupa el botón «Mapa» sobre la barra (alto + separación + aire): la lista lo deja libre para no quedar tapada. */
const MAP_BUTTON_CLEARANCE = MinTouch + MAP_BUTTON_GAP + Spacing.three;

type HomeBundle = { homeData: HomeData; items: ExploreItem[]; favoriteIds: Set<string> };

/** Cuántas tarjetas de esqueleto se muestran mientras carga (2 filas de la grilla). */
const SKELETON_ROWS = 2;

export function HomeScreen() {
    const colors = useTheme();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { gutter, columns, cardWidth, bottomInset } = useLayout();
    const { riderPrice } = usePricing();

    const [activeCategory, setActiveCategory] = useState('all');

    // Estado de búsqueda/filtros — cuando cualquiera de esto está activo,
    // se muestra la grilla en vez de los carruseles.
    const [rawQuery, setRawQuery] = useState('');
    const [query, setQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [city, setCity] = useState<string | null>(null);
    const [maxPrice, setMaxPrice] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Estados reales: cargando / error / éxito. Un fallo de red ya no se ve como «no hay equipos».
    const { status, data: bundle, error, refreshError, refreshing, reload, refresh } = useAsyncData<HomeBundle>(
        async () => {
            const [homeData, items, favIds] = await Promise.all([
                getHomeData(),
                getExploreItems(),
                isAuthenticated ? getUserFavIds() : Promise.resolve({ equipoIds: [], paqueteIds: [] }),
            ]);
            return { homeData, items, favoriteIds: new Set([...favIds.equipoIds, ...favIds.paqueteIds]) };
        },
        { deps: [isAuthenticated] },
    );
    const data = bundle?.homeData ?? null;
    const exploreItems = useMemo(() => bundle?.items ?? [], [bundle]);
    const favoriteIds = useMemo(() => bundle?.favoriteIds ?? new Set<string>(), [bundle]);
    const loading = status === 'loading';

    useEffect(() => {
        const timer = setTimeout(() => setQuery(rawQuery), 300);
        return () => clearTimeout(timer);
    }, [rawQuery]);

    const onRefresh = refresh;

    // Modo búsqueda activo: el usuario escribió algo, activó un filtro de
    // ciudad/precio, o simplemente tiene el input enfocado (para que ver
    // los resultados no requiera escribir primero, igual que Airbnb).
    const isSearching = searchFocused || query.trim().length > 0 || city !== null || maxPrice.length > 0;

    const cities = useMemo(() => {
        // Una sola chip por ciudad aunque difiera en mayúsculas o acentos.
        const byKey = new Map<string, string>();
        exploreItems.forEach((item) => item.city && !byKey.has(cityKey(item.city)) && byKey.set(cityKey(item.city), item.city));
        return Array.from(byKey.values()).sort();
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
        // «Hasta $X» se compara con el precio por día que ve el Rider (precio del Partner + comisión).
        if (!isNaN(max) && max > 0) list = list.filter((item) => riderPrice(item.daily_price) <= max * 100);
        return list;
    }, [exploreItems, activeCategory, city, query, maxPrice, riderPrice]);

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

    const activeFilters: ActiveFilter[] = [
        ...(city ? [{ id: 'city', label: city, onRemove: () => setCity(null) }] : []),
        ...(maxPrice ? [{ id: 'price', label: `Hasta ${maxPrice}`, onRemove: () => setMaxPrice('') }] : []),
        ...(activeCategory !== 'all' ? [{ id: 'category', label: CATEGORY_LABELS[activeCategory] ?? activeCategory, onRemove: () => setActiveCategory('all') }] : []),
    ];
    const activeFilterCount = activeFilters.length;

    const header = (
        <View style={{ paddingHorizontal: gutter }}>
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
    const tabActions = isAuthenticated ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
            <FavoritesIconButton />
            <CartIconButton />
        </View>
    ) : undefined;

    if (loading) {
        return (
            <TabScreen title="ArtRider" actions={tabActions}>
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
            </TabScreen>
        );
    }

    if (status === 'error') {
        return (
            <TabScreen title="ArtRider" actions={tabActions}>
                <ErrorState fill error={error} onRetry={reload} />
            </TabScreen>
        );
    }

    return (
        <TabScreen title="ArtRider" actions={tabActions}>
            {header}
            {refreshError ? <View style={{ paddingTop: Rhythm.titleToContent }}><RefreshErrorNotice error={refreshError} onRetry={reload} /></View> : null}

            <View style={{ paddingTop: Rhythm.titleToContent }}>
                <CategoryStrip activeCategory={activeCategory} onSelect={setActiveCategory} gutter={gutter} />
            </View>

            {isSearching ? (
                <>
                    {/* Botón «Filtros» (con contador) + filtros activos como píldoras con X */}
                    <SearchFilterBar gutter={gutter} count={activeFilterCount} onOpenFilters={() => setFiltersOpen(true)} filters={activeFilters} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, paddingTop: Rhythm.cardGap }}>
                        <Text variant="captionStrong" color="textSecondary" accessibilityRole="header">
                            {filteredExploreItems.length} {filteredExploreItems.length === 1 ? 'resultado' : 'resultados'}
                        </Text>
                        {hasActiveFilters ? <Button label="Limpiar filtros" variant="ghost" size="sm" onPress={clearFilters} style={{ marginRight: -Spacing.three }} /> : <View style={{ height: MinTouch }} />}
                    </View>

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
                            columnWrapperStyle={{ gap: Rhythm.cardGap, paddingHorizontal: gutter }}
                            contentContainerStyle={{ gap: Spacing.four, paddingTop: Spacing.two, paddingBottom: MAP_BUTTON_CLEARANCE + bottomInset }}
                            keyboardShouldPersistTaps="handled"
                            contentInsetAdjustmentBehavior="automatic"
                            renderItem={({ item }) => <ItemCard item={item} width={cardWidth()} isFavorito={favoriteIds.has(item.id)} />}
                        />
                    )}

                    {/* Botón «Mapa»: centrado y anclado justo encima de la barra inferior (safe area incluida). */}
                    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: bottomInset + MAP_BUTTON_GAP, alignItems: 'center', zIndex: 3 }}>
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
                                    minHeight: MinTouch,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: Spacing.two,
                                    backgroundColor: colors.primary,
                                    paddingHorizontal: gutter,
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
                    </View>

                    <SearchFiltersSheet
                        visible={filtersOpen}
                        onClose={() => setFiltersOpen(false)}
                        cities={cities}
                        city={city}
                        onCityChange={setCity}
                        maxPrice={maxPrice}
                        onMaxPriceChange={setMaxPrice}
                        category={activeCategory}
                        onCategoryChange={setActiveCategory}
                        resultCount={filteredExploreItems.length}
                        onReset={() => {
                            setCity(null);
                            setMaxPrice('');
                            setActiveCategory('all');
                        }}
                        canReset={activeFilterCount > 0}
                    />
                </>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    keyboardShouldPersistTaps="handled"
                    // «never»: con «automatic» iOS ya suma por su cuenta el inset de la barra de pestañas y la safe area,
                    // y se duplicaba con el padding de abajo (blanco enorme tras el último carrusel). El único margen
                    // inferior es el del contentContainerStyle: barra de vidrio + safe area (bottomInset) + 16.
                    contentInsetAdjustmentBehavior="never"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: Rhythm.chipsToSection, gap: Rhythm.section, paddingBottom: bottomInset + Spacing.three }}
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
        </TabScreen>
    );
}
