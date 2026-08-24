import { useCallback, useState } from 'react';
import { View, FlatList, Image, Pressable, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORY_LABELS } from '@/constants/categories';
import { FilterChip } from '@/components/ui/FilterChip';
import {
    getMyListings, toggleListingPublished, deleteListing, type MyListing,
    getMyPackages, togglePackagePublished, deletePackage, type MyPackage,
} from '@/services/providerCatalogService';

function ListingRow({ item, onChanged }: { item: MyListing; onChanged: () => void }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const [busy, setBusy] = useState(false);
    const router = useRouter();

    async function handleToggle(value: boolean) {
        setBusy(true);
        await toggleListingPublished(item.id, value);
        setBusy(false);
        onChanged();
    }

    function handleDelete() {
        Alert.alert('Eliminar anuncio', `¿Eliminar "${item.title}"? No se podrá deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteListing(item.id); onChanged(); } },
        ]);
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: colors.backgroundElement, borderRadius: Radius.lg, padding: Spacing.three }}>
            <View style={{ width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden' }}>
                {item.cover_image_url ? (
                    <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                )}
            </View>
            <View style={{ flex: 1 }}>
                <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                    {item.title ?? 'Sin título'}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {CATEGORY_LABELS[item.category ?? ''] ?? 'Sin categoría'} · ${(item.daily_price / 100).toFixed(0)}/día
                </ThemedText>
            </View>
            <Pressable onPress={() => router.push(`/provider/edit-listing/${item.id}` as any)} hitSlop={8}>
                <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            </Pressable>
            {busy ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <Switch value={item.is_published} onValueChange={handleToggle} trackColor={{ true: colors.primary }} />
            )}
            <Pressable onPress={handleDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
        </View>
    );
}

function PackageRow({ item, onChanged }: { item: MyPackage; onChanged: () => void }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const [busy, setBusy] = useState(false);
    const router = useRouter();

    async function handleToggle(value: boolean) {
        setBusy(true);
        await togglePackagePublished(item.id, value);
        setBusy(false);
        onChanged();
    }

    function handleDelete() {
        Alert.alert('Eliminar paquete', `¿Eliminar "${item.title}"? No se podrá deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => { await deletePackage(item.id); onChanged(); } },
        ]);
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: colors.backgroundElement, borderRadius: Radius.lg, padding: Spacing.three }}>
            <View style={{ width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden' }}>
                {item.cover_image_url ? (
                    <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                )}
            </View>
            <View style={{ flex: 1 }}>
                <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                    {item.title ?? 'Sin título'}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    Paquete · ${(item.daily_price / 100).toFixed(0)}/día
                </ThemedText>
            </View>
            <Pressable onPress={() => router.push(`/provider/edit-package/${item.id}` as any)} hitSlop={8}>
                <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            </Pressable>
            {busy ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <Switch value={item.is_published} onValueChange={handleToggle} trackColor={{ true: colors.primary }} />
            )}
            <Pressable onPress={handleDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
        </View>
    );
}

export function MyListingsScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();
    const [tab, setTab] = useState<'equipos' | 'paquetes'>('equipos');
    const [listings, setListings] = useState<MyListing[]>([]);
    const [packages, setPackages] = useState<MyPackage[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        Promise.all([getMyListings(), getMyPackages()])
            .then(([l, p]) => {
                setListings(l);
                setPackages(p);
            })
            .finally(() => setLoading(false));
    }, []);

    useFocusEffect(load);

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    const activeData = tab === 'equipos' ? listings : packages;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three }}>
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text }}>Anuncios</ThemedText>
                <Pressable
                    onPress={() => router.push('/provider/new-listing' as any)}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.three }}>
                {(['equipos', 'paquetes'] as const).map((t) => (
                    <FilterChip
                        key={t}
                        label={t === 'equipos' ? `Equipos (${listings.length})` : `Paquetes (${packages.length})`}
                        active={tab === t}
                        onPress={() => setTab(t)}
                        colors={colors}
                    />
                ))}
            </View>

            {activeData.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five }}>
                    <Ionicons name={tab === 'equipos' ? 'cube-outline' : 'layers-outline'} size={40} color={colors.textSecondary} style={{ marginBottom: Spacing.three }} />
                    <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing.four }}>
                        {tab === 'equipos' ? 'Todavía no tienes equipos publicados.' : 'Todavía no tienes paquetes publicados.'}
                    </ThemedText>
                    <Pressable
                        onPress={() => router.push('/provider/new-listing' as any)}
                        style={{ backgroundColor: colors.primary, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: Radius.lg }}
                    >
                        <ThemedText style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 }}>
                            {tab === 'equipos' ? 'Publicar mi primer equipo' : 'Crear mi primer paquete'}
                        </ThemedText>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={activeData}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}
                    renderItem={({ item }) =>
                        tab === 'equipos'
                            ? <ListingRow item={item as MyListing} onChanged={load} />
                            : <PackageRow item={item as MyPackage} onChanged={load} />
                    }
                />
            )}
        </SafeAreaView>
    );
}