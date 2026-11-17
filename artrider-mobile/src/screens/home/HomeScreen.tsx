import { useEffect, useMemo, useState } from 'react';
import { ScrollView, RefreshControl, View, TextInput, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CategoryStrip } from '@/components/home/CategoryStrip';
import { CityCarousel } from '@/components/home/CityCarousel';
import { CartIconButton } from '@/components/cart/CartIconButton';
import { Button } from '@/components/ui/Button';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemCard } from '@/components/ui/ItemCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { TabScreen } from '@/components/ui/TabScreen';
import { ItemCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Fonts, MinTouch, Radius, Rhythm, Shadows, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getHomeData, type HomeData } from '@/services/homeService';
import { getExploreItems, type ExploreItem } from '@/services/exploreService';
import { getUserFavIds } from '@/services/favoritosService';
import { useAuth } from '@/hooks/useAuth';
import { cityKey } from '@/utils/city';

/** Alto del botón «Mapa» + 16 arriba y 16 abajo: la lista deja ese espacio para no quedar tapada. */
const MAP_BUTTON_CLEARANCE = MinTouch + Spacing.three * 2;

type HomeBundle = { homeData: HomeData; items: ExploreItem[]; favoriteIds: Set<string> };

/** Cuántas tarjetas de esqueleto se muestran mientras carga (2 filas de la grilla). */
const SKELETON_ROWS = 2;

export function HomeScreen() {
    const colors = useTheme();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { gutter, columns, cardWidth, bottomInset } = useLayout();

    const [activeCategory, setActiveCategory] = useState('all');

    // Estado de búsqueda/filtros — cuando cualquiera de esto está activo,
    // se muestra la grilla en vez de los carruseles.
    const [rawQuery, setRawQuery] = useState('');
    const [query, setQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [city, setCity] = useState<string | null>(null);
    const [maxPrice, setMaxPrice] = useState('');

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
    const tabActions = isAuthenticated ? <CartIconButton /> : undefined;

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
                    {/* Ciudad + precio — mismos filtros que antes tenía Explorar */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        // 12 de separación respecto a las chips de categoría y el mismo margen lateral.
                        style={{ flexGrow: 0, marginTop: Rhythm.cardGap }}
                        contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: gutter, alignItems: 'center' }}
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
                    </ScrollView>

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
                                bottom: bottomInset + Spacing.three,
                                alignSelf: 'center',
                                zIndex: 3,
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
                </>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    keyboardShouldPersistTaps="handled"
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: Rhythm.chipsToSection, gap: Rhythm.section, paddingBottom: bottomInset + Spacing.four }}
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
