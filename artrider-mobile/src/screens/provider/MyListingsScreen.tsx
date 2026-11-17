import { useCallback, useState } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ManagedRow } from '@/components/provider/ManagedRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenSkeleton } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORY_LABELS } from '@/constants/categories';
import { Chip } from '@/components/ui/Chip';
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
        <ManagedRow
            title={item.title ?? 'Sin título'}
            meta={`${CATEGORY_LABELS[item.category ?? ''] ?? 'Sin categoría'} · $${(item.daily_price / 100).toFixed(0)}/día`}
            coverUrl={item.cover_image_url}
            published={item.is_published}
            busy={busy}
            onTogglePublished={handleToggle}
            onEdit={() => router.push(`/provider/edit-listing/${item.id}` as never)}
            onDelete={handleDelete}
        />
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
        <ManagedRow
            title={item.title ?? 'Sin título'}
            meta={`Paquete · $${(item.daily_price / 100).toFixed(0)}/día`}
            coverUrl={item.cover_image_url}
            published={item.is_published}
            busy={busy}
            onTogglePublished={handleToggle}
            onEdit={() => router.push(`/provider/edit-package/${item.id}` as never)}
            onDelete={handleDelete}
        />
    );
}

export function MyListingsScreen() {
  const { gutter } = useLayout();
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
            <ScreenSkeleton />
        );
    }

    const activeData = tab === 'equipos' ? listings : packages;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, paddingVertical: Spacing.three }}>
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text }}>Anuncios</ThemedText>
                <Pressable
                    onPress={() => router.push('/provider/new-listing' as any)}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Ionicons name="add" size={20} color={colors.onPrimary} />
                </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.two, paddingHorizontal: gutter, paddingBottom: Spacing.three }}>
                {(['equipos', 'paquetes'] as const).map((t) => (
                    <Chip
                        key={t}
                        label={t === 'equipos' ? `Equipos (${listings.length})` : `Paquetes (${packages.length})`}
                        active={tab === t}
                        onPress={() => setTab(t)}
                    />
                ))}
            </View>

            {activeData.length === 0 ? (
                <EmptyState
                    icon={tab === 'equipos' ? 'cube-outline' : 'layers-outline'}
                    title={tab === 'equipos' ? 'Aún no publicas equipos' : 'Aún no creas paquetes'}
                    description={tab === 'equipos' ? 'Todavía no tienes equipos publicados.' : 'Todavía no tienes paquetes publicados.'}
                    actionLabel={tab === 'equipos' ? 'Publicar mi primer equipo' : 'Crear mi primer paquete'}
                    onAction={() => router.push('/provider/new-listing' as never)}
                    style={{ flex: 1 }}
                />
            ) : (
                <FlatList
                    data={activeData}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: gutter, paddingVertical: Spacing.four, gap: Spacing.three }}
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