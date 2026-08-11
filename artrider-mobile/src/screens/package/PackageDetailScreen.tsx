import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Image, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getPackageById, type PackageWithItems } from '@/services/packagesService';
import { toggleFavorito, getUserFavIds } from '@/services/favoritosService';
import { findExistingConversation } from '@/services/messagesService';
import { useAuth } from '@/hooks/useAuth';

export function PackageDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { session } = useAuth();

    const [pkg, setPkg] = useState<PackageWithItems | null>(null);
    const [esFavorito, setEsFavorito] = useState(false);
    const [loading, setLoading] = useState(true);
    const [contacting, setContacting] = useState(false);

    useEffect(() => {
        if (!id) return;

        async function load() {
            const data = await getPackageById(id);
            setPkg(data);

            if (session?.user) {
                const favIds = await getUserFavIds();
                setEsFavorito(favIds.paqueteIds.includes(id));
            }

            setLoading(false);
        }

        load();
    }, [id, session]);

    async function handleToggleFavorito() {
        if (!pkg) return;
        setEsFavorito((prev) => !prev);
        const result = await toggleFavorito(pkg.id, 'paquete');
        if (!result.error) setEsFavorito(result.esFavorito);
    }

    async function handleContactarProveedor() {
        if (!pkg) return;
        if (!session?.user) {
            router.push('/login');
            return;
        }
        setContacting(true);
        try {
            const existingId = await findExistingConversation(pkg.provider_id, null, pkg.id);
            if (existingId) {
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: existingId, otherName: pkg.provider?.brand_name ?? 'Proveedor' },
                });
            } else {
                router.push({
                    pathname: '/chat/[id]',
                    params: {
                        id: 'new',
                        otherName: pkg.provider?.brand_name ?? 'Proveedor',
                        providerId: pkg.provider_id,
                        packageId: pkg.id,
                    },
                });
            }
        } catch (e) {
            console.error('[PackageDetailScreen] handleContactarProveedor:', e);
        } finally {
            setContacting(false);
        }
    }

    if (loading || !pkg) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    const price = pkg.daily_price / 100;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView bounces={false}>
                <View style={{ width: '100%', height: 260 }}>
                    {pkg.cover_image_url ? (
                        <Image source={{ uri: pkg.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                    )}
                </View>

                <Pressable
                    onPress={handleToggleFavorito}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: Spacing.four,
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name={esFavorito ? 'heart' : 'heart-outline'} size={20} color={esFavorito ? '#C026D3' : '#fff'} />
                </Pressable>

                <View style={{ padding: Spacing.four }}>
                    <View
                        style={{
                            alignSelf: 'flex-start',
                            backgroundColor: `${colors.primary}15`,
                            paddingHorizontal: Spacing.two,
                            paddingVertical: 5,
                            borderRadius: 999,
                            marginBottom: Spacing.two,
                        }}
                    >
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.primary }}>
                            Paquete
                        </ThemedText>
                    </View>

                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginBottom: Spacing.one }}>
                        {pkg.title}
                    </ThemedText>

                    {pkg.capacity_people != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.three }}>
                            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                            <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>
                                Ideal para hasta {pkg.capacity_people} {pkg.capacity_people === 1 ? 'persona' : 'personas'}
                            </ThemedText>
                        </View>
                    )}

                    <Pressable
                        onPress={handleContactarProveedor}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.three,
                            paddingVertical: Spacing.three,
                            borderTopWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <View
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: colors.text,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ThemedText style={{ color: colors.background, fontFamily: 'Inter_700Bold', fontSize: 16 }}>
                                {(pkg.provider?.brand_name ?? 'P').charAt(0).toUpperCase()}
                            </ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text }}>
                                Ofrecido por {pkg.provider?.brand_name ?? 'Proveedor ArtRider'}
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Proveedor verificado</ThemedText>
                            </View>
                        </View>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                    </Pressable>

                    {pkg.description && (
                        <View style={{ paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.two }}>
                                Sobre este paquete
                            </ThemedText>
                            <ThemedText style={{ fontSize: 14, lineHeight: 21, color: colors.textSecondary }}>
                                {pkg.description}
                            </ThemedText>
                        </View>
                    )}

                    <View style={{ paddingVertical: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text, marginBottom: Spacing.three }}>
                            Equipos incluidos
                        </ThemedText>
                        {pkg.items.map((item) => (
                            <View
                                key={item.id}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three }}
                            >
                                <View style={{ width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: colors.backgroundElement }}>
                                    {item.listing?.cover_image_url ? (
                                        <Image source={{ uri: item.listing.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    ) : (
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
                                        </View>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text }}>
                                        {item.listing?.title ?? 'Equipo no disponible'}
                                    </ThemedText>
                                    {(item.listing?.brand || item.listing?.model) && (
                                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                                            {[item.listing?.brand, item.listing?.model].filter(Boolean).join(' · ')}
                                        </ThemedText>
                                    )}
                                </View>
                                <View
                                    style={{
                                        backgroundColor: colors.backgroundElement,
                                        borderRadius: 999,
                                        paddingHorizontal: Spacing.two,
                                        paddingVertical: 4,
                                    }}
                                >
                                    <ThemedText style={{ fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: colors.text }}>
                                        x{item.quantity}
                                    </ThemedText>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            <View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.two,
                    padding: Spacing.four,
                    backgroundColor: colors.background,
                    borderTopWidth: 1,
                    borderColor: colors.border,
                }}
            >
                <Pressable
                    onPress={handleContactarProveedor}
                    disabled={contacting}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: Radius.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {contacting ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.text} />
                    )}
                </Pressable>

                <Pressable
                    onPress={() => router.push(`/checkout/package/${pkg.id}?mode=cart` as any)}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: Radius.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name="cart-outline" size={19} color={colors.text} />
                </Pressable>

                <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text }}>
                        ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
                        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}> /día</ThemedText>
                    </ThemedText>
                </View>

                <Pressable
                    onPress={() => router.push(`/checkout/package/${pkg.id}` as any)}
                    style={{ backgroundColor: colors.primary, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: Radius.lg }}
                >
                    <ThemedText style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 }}>Reservar</ThemedText>
                </Pressable>
            </View>
        </View>
    );
}