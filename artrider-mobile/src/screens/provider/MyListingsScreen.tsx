import { useState } from 'react';
import { FlatList, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { ManagedRow } from '@/components/provider/ManagedRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, RefreshErrorNotice } from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ScreenSkeleton } from '@/components/ui/Skeleton';
import { Rhythm, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { CATEGORY_LABELS } from '@/constants/categories';
import { ChipRow } from '@/components/ui/ChipRow';
import { IconButton } from '@/components/ui/IconButton';
import { TabScreen } from '@/components/ui/TabScreen';
import { useTheme } from '@/hooks/use-theme';
import {
    getMyListings, toggleListingPublished, deleteListing, type MyListing,
    getMyPackages, togglePackagePublished, deletePackage, type MyPackage,
} from '@/services/providerCatalogService';

function ListingRow({ item, onChanged }: { item: MyListing; onChanged: () => void }) {
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
    const { gutter, bottomInset } = useLayout();
    const colors = useTheme();
    const router = useRouter();
    const [tab, setTab] = useState<'equipos' | 'paquetes'>('equipos');
    const { data, status, error, refreshError, refreshing, reload, refresh } = useAsyncData<{ listings: MyListing[]; packages: MyPackage[] }>(
        async () => {
            const [listings, packages] = await Promise.all([getMyListings(), getMyPackages()]);
            return { listings, packages };
        },
        { reloadOnFocus: true },
    );
    const listings = data?.listings ?? [];
    const packages = data?.packages ?? [];
    const load = reload;

    if (status === 'loading') {
        return (
            <TabScreen title="Anuncios">
                <ScreenSkeleton />
            </TabScreen>
        );
    }

    if (status === 'error') {
        return (
            <TabScreen title="Anuncios">
                <ErrorState fill error={error} onRetry={reload} />
            </TabScreen>
        );
    }

    const activeData = tab === 'equipos' ? listings : packages;

    return (
        <TabScreen
            title="Anuncios"
            actions={<IconButton icon="add" label="Publicar un anuncio" variant="surface" onPress={() => router.push('/provider/new-listing' as never)} />}
        >
            <ChipRow
                options={[
                    { id: 'equipos', label: `Equipos (${listings.length})` },
                    { id: 'paquetes', label: `Paquetes (${packages.length})` },
                ]}
                value={tab}
                onChange={setTab}
            />

            {activeData.length === 0 ? (
                <EmptyState
                    fill
                    icon={tab === 'equipos' ? 'cube-outline' : 'layers-outline'}
                    title={tab === 'equipos' ? 'Aún no publicas equipos' : 'Aún no creas paquetes'}
                    description={tab === 'equipos' ? 'Publica tu primer equipo para que los clientes puedan rentarlo.' : 'Combina varios de tus equipos en un paquete listo para rentar.'}
                    actionLabel={tab === 'equipos' ? 'Publicar mi primer equipo' : 'Crear mi primer paquete'}
                    onAction={() => router.push('/provider/new-listing' as never)}
                />
            ) : (
                <FlatList
                    data={activeData}
                    keyExtractor={(item) => item.id}
                    contentInsetAdjustmentBehavior="automatic"
                    ListHeaderComponent={refreshError ? <RefreshErrorNotice error={refreshError} onRetry={reload} /> : undefined}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
                    contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Spacing.three, paddingBottom: bottomInset + Spacing.four, gap: Rhythm.cardGap }}
                    renderItem={({ item }) =>
                        tab === 'equipos' ? <ListingRow item={item as MyListing} onChanged={load} /> : <PackageRow item={item as MyPackage} onChanged={load} />
                    }
                />
            )}
        </TabScreen>
    );
}
