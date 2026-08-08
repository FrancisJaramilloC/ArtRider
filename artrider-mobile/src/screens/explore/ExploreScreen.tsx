import { useEffect, useMemo, useState } from 'react';
import { View, TextInput, ScrollView, Pressable, FlatList, useColorScheme, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ExploreCard } from '@/components/explore/ExploreCard';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import { getExploreItems, type ExploreItem } from '@/services/exploreService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.four * 2 - Spacing.three) / 2;

export function ExploreScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [allItems, setAllItems] = useState<ExploreItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [rawQuery, setRawQuery] = useState('');
    const [query, setQuery] = useState(''); // versión con debounce
    const [category, setCategory] = useState('all');
    const [city, setCity] = useState<string | null>(null);
    const [maxPrice, setMaxPrice] = useState('');

    useEffect(() => {
        getExploreItems().then(setAllItems).finally(() => setLoading(false));
    }, []);

    // Debounce de 300ms para la búsqueda de texto
    useEffect(() => {
        const timer = setTimeout(() => setQuery(rawQuery), 300);
        return () => clearTimeout(timer);
    }, [rawQuery]);

    // Ciudades disponibles, calculadas dinámicamente de los datos reales
    const cities = useMemo(() => {
        const set = new Set<string>();
        allItems.forEach((item) => item.city && set.add(item.city));
        return Array.from(set).sort();
    }, [allItems]);

    const filtered = useMemo(() => {
        let list = allItems;

        if (category !== 'all') {
            list = list.filter((item) => item.category === category);
        }
        if (city) {
            list = list.filter((item) => item.city === city);
        }
        if (query.trim()) {
            const q = query.trim().toLowerCase();
            list = list.filter((item) => item.title.toLowerCase().includes(q) || (item.city ?? '').toLowerCase().includes(q));
        }
        const max = parseFloat(maxPrice);
        if (!isNaN(max) && max > 0) {
            list = list.filter((item) => item.daily_price <= max * 100);
        }

        return list;
    }, [allItems, category, city, query, maxPrice]);

    const hasActiveFilters = category !== 'all' || city !== null || rawQuery.length > 0 || maxPrice.length > 0;

    function clearFilters() {
        setRawQuery('');
        setQuery('');
        setCategory('all');
        setCity(null);
        setMaxPrice('');
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
            {/* Búsqueda */}
            <View style={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.two }}>
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
                        placeholder="¿Qué equipo o paquete buscas?"
                        placeholderTextColor={colors.textSecondary}
                        style={{ flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.text }}
                    />
                    {rawQuery.length > 0 && (
                        <Pressable onPress={() => setRawQuery('')} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Categorías */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two }}
            >
                {CATEGORIES.map(({ id, label, icon }) => {
                    const isActive = category === id;
                    return (
                        <Pressable
                            key={id}
                            onPress={() => setCategory(id)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingHorizontal: Spacing.three,
                                paddingVertical: Spacing.two,
                                borderRadius: 999,
                                backgroundColor: isActive ? colors.primary : 'transparent',
                                borderWidth: isActive ? 0 : 1,
                                borderColor: colors.border,
                            }}
                        >
                            <Ionicons name={icon as any} size={14} color={isActive ? '#fff' : colors.textSecondary} />
                            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: isActive ? '#fff' : colors.textSecondary }}>
                                {label}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Ciudad + precio */}
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

            {/* Resultados */}
            {filtered.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.five }}>
                    <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                        No hay equipos ni paquetes con estos filtros.
                    </ThemedText>
                    {hasActiveFilters && (
                        <Pressable
                            onPress={clearFilters}
                            style={{ backgroundColor: colors.primary, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.lg }}
                        >
                            <ThemedText style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 }}>Limpiar filtros</ThemedText>
                        </Pressable>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}
                    contentContainerStyle={{ gap: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six }}
                    renderItem={({ item }) => <ExploreCard item={item} width={CARD_WIDTH} />}
                />
            )}
        </SafeAreaView>
    );
}