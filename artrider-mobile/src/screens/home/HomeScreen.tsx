import { useEffect, useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { CityCarousel } from '@/components/home/CityCarousel';
import { CartIconButton } from '@/components/cart/CartIconButton';
import { Colors, Spacing } from '@/constants/theme';
import { getHomeData, type HomeData } from '@/services/homeService';
import { getUserFavIds } from '@/services/favoritosService';
import { useAuth } from '@/hooks/useAuth';
export function HomeScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { isAuthenticated } = useAuth();
    const [data, setData] = useState<HomeData | null>(null);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const load = useCallback(async () => {
        const [homeData, favIds] = await Promise.all([
            getHomeData(),
            isAuthenticated ? getUserFavIds() : Promise.resolve({ equipoIds: [], paqueteIds: [] }),
        ]);
        setData(homeData);
        setFavoriteIds(new Set([...favIds.equipoIds, ...favIds.paqueteIds]));
    }, [isAuthenticated]);
    useEffect(() => {
        load().finally(() => setLoading(false));
    }, [load]);
    async function onRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
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
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text }}>
                        ArtRider
                    </ThemedText>
                    {isAuthenticated && <CartIconButton />}
                </View>
                <CategoryStrip />
                {data?.cityGroups.map((group) => (
                    <CityCarousel
                        key={group.city}
                        title={`Equipos populares en ${group.city}`}
                        items={group.items}
                        favoriteIds={favoriteIds}
                    />
                ))}
                {data && data.packages.length > 0 && (
                    <CityCarousel
                        title="Paquetes destacados"
                        subtitle="Combos listos para rentar que ahorran dinero y tiempo"
                        items={data.packages}
                        favoriteIds={favoriteIds}
                    />
                )}
                <View style={{ height: Spacing.six }} />
            </ScrollView>
        </SafeAreaView>
    );
}