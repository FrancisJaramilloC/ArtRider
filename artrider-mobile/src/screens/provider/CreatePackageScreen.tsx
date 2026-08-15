import { useEffect, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
    getMyListings,
    createPackage,
    getPackageForEdit,
    updatePackage,
    type MyListing,
} from '@/services/providerCatalogService';

type StepId = 'items' | 'details' | 'capacity' | 'photo' | 'price' | 'review';
const STEPS: StepId[] = ['items', 'details', 'capacity', 'photo', 'price', 'review'];
const STEP_LABELS: Record<StepId, string> = {
    items: 'Equipos',
    details: 'Detalles',
    capacity: 'Capacidad',
    photo: 'Foto',
    price: 'Precio',
    review: 'Revisión',
};

export function CreatePackageScreen() {
    const { id: editPackageId } = useLocalSearchParams<{ id?: string }>();
    const isEdit = !!editPackageId;
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [loadingExisting, setLoadingExisting] = useState(isEdit);
    const [step, setStep] = useState(0);
    const [myListings, setMyListings] = useState<MyListing[]>([]);
    const [loadingListings, setLoadingListings] = useState(true);
    const [selected, setSelected] = useState<Record<string, number>>({});
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [capacity, setCapacity] = useState('');
    const [dailyPrice, setDailyPrice] = useState('');
    const [coverUri, setCoverUri] = useState<string | null>(null);
    const [coverMime, setCoverMime] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        getMyListings().then((all) => {
            setMyListings(all.filter((l) => l.is_published));
            setLoadingListings(false);
        });
    }, []);

    useEffect(() => {
        if (!isEdit || !editPackageId) return;
        getPackageForEdit(editPackageId).then((data) => {
            if (data) {
                setTitle(data.title);
                setDescription(data.description);
                setCapacity(String(data.capacityPeople));
                setDailyPrice(String(data.dailyPriceDollars));
                setCoverUri(data.coverImageUrl);
                const preselected: Record<string, number> = {};
                data.items.forEach((item) => { preselected[item.listingId] = item.quantity; });
                setSelected(preselected);
            }
            setLoadingExisting(false);
        });
    }, [isEdit, editPackageId]);

    function toggleItem(listingId: string) {
        setSelected((prev) => {
            const next = { ...prev };
            if (next[listingId]) {
                delete next[listingId];
            } else {
                next[listingId] = 1;
            }
            return next;
        });
    }

    function setItemQuantity(listingId: string, qty: number) {
        setSelected((prev) => ({ ...prev, [listingId]: Math.max(1, qty) }));
    }

    async function pickImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
        });
        if (!result.canceled && result.assets[0]) {
            setCoverUri(result.assets[0].uri);
            setCoverMime(result.assets[0].mimeType ?? 'image/jpeg');
        }
    }

    const currentStepId = STEPS[step];
    const selectedCount = Object.keys(selected).length;

    const canContinue = (() => {
        switch (currentStepId) {
            case 'items': return selectedCount > 0;
            case 'details': return title.trim().length >= 3;
            case 'capacity': return parseInt(capacity, 10) > 0;
            case 'photo': return !!coverUri;
            case 'price': return parseFloat(dailyPrice) > 0;
            default: return true;
        }
    })();

    function handleBack() {
        if (step === 0) {
            router.back();
            return;
        }
        setStep((s) => s - 1);
        setError(null);
    }

    async function handleContinue() {
        if (step < STEPS.length - 1) {
            setStep((s) => s + 1);
            return;
        }

        setError(null);
        setPublishing(true);
        const items = Object.entries(selected).map(([listingId, quantity]) => ({ listingId, quantity }));

        if (isEdit && editPackageId) {
            const result = await updatePackage({
                packageId: editPackageId,
                title,
                description,
                capacityPeople: parseInt(capacity, 10),
                dailyPriceDollars: parseFloat(dailyPrice),
                newCoverImageUri: coverUri && !coverUri.startsWith('http') ? coverUri : null,
                newCoverImageMimeType: coverMime,
                items,
            });
            setPublishing(false);
            if (result.error) {
                setError(result.error);
                return;
            }
        } else {
            const result = await createPackage({
                title,
                description,
                capacityPeople: parseInt(capacity, 10),
                dailyPriceDollars: parseFloat(dailyPrice),
                coverImageUri: coverUri!,
                coverImageMimeType: coverMime!,
                items,
            });
            setPublishing(false);
            if (result.error) {
                setError(result.error);
                return;
            }
        }

        router.replace('/(provider)/listings' as any);
    }

    function renderPreviewCard() {
        return (
            <View style={{ borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: colors.backgroundElement }}>
                <View style={{ width: '100%', aspectRatio: 4 / 3 }}>
                    {coverUri ? (
                        <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                    )}
                </View>
                <View style={{ padding: Spacing.four }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text }}>
                        {title || 'Sin título'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                        Hasta {capacity || '0'} personas
                    </ThemedText>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, marginTop: Spacing.two }}>
                        ${dailyPrice || '0'} <ThemedText style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary }}>/día</ThemedText>
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: Spacing.two }}>
                        {selectedCount} {selectedCount === 1 ? 'equipo incluido' : 'equipos incluidos'}
                    </ThemedText>
                </View>
            </View>
        );
    }

    if (loadingExisting) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.two }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three }}>
                        <Pressable onPress={handleBack} hitSlop={8}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </Pressable>
                        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                            {STEPS.map((_, i) => (
                                <View
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: 3,
                                        borderRadius: 2,
                                        backgroundColor: i <= step ? colors.primary : colors.backgroundElement,
                                    }}
                                />
                            ))}
                        </View>
                        <Pressable onPress={() => setShowPreview(true)} hitSlop={8}>
                            <Ionicons name="eye-outline" size={22} color={colors.text} />
                        </Pressable>
                    </View>
                    <ThemedText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, marginBottom: Spacing.one }}>
                        Paso {step + 1} de {STEPS.length}
                    </ThemedText>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginBottom: Spacing.four }}>
                        {STEP_LABELS[currentStepId]}
                    </ThemedText>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.six }} keyboardShouldPersistTaps="handled">
                    {currentStepId === 'items' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.three }}>
                                Elige los equipos que van a formar este paquete, y cuántas unidades de cada uno.
                            </ThemedText>
                            {loadingListings ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : myListings.length === 0 ? (
                                <ThemedText style={{ color: colors.textSecondary, fontSize: 13.5 }}>
                                    Todavía no tienes equipos publicados — primero publica al menos un equipo individual para poder armar un paquete con ellos.
                                </ThemedText>
                            ) : (
                                <View style={{ gap: Spacing.two }}>
                                    {myListings.map((listing) => {
                                        const isSelected = !!selected[listing.id];
                                        return (
                                            <View
                                                key={listing.id}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: Spacing.three,
                                                    padding: Spacing.three,
                                                    borderRadius: Radius.lg,
                                                    borderWidth: isSelected ? 2 : 1,
                                                    borderColor: isSelected ? colors.primary : colors.border,
                                                    backgroundColor: isSelected ? `${colors.primary}10` : 'transparent',
                                                }}
                                            >
                                                <Pressable onPress={() => toggleItem(listing.id)} style={{ width: 44, height: 44, borderRadius: Radius.md, overflow: 'hidden' }}>
                                                    {listing.cover_image_url ? (
                                                        <Image source={{ uri: listing.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                                    ) : (
                                                        <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                                                    )}
                                                </Pressable>
                                                <Pressable onPress={() => toggleItem(listing.id)} style={{ flex: 1 }}>
                                                    <ThemedText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text }}>
                                                        {listing.title ?? 'Equipo'}
                                                    </ThemedText>
                                                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                                                        ${(listing.daily_price / 100).toFixed(0)}/día
                                                    </ThemedText>
                                                </Pressable>
                                                {isSelected ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                                                        <Pressable
                                                            onPress={() => setItemQuantity(listing.id, selected[listing.id] - 1)}
                                                            style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Ionicons name="remove" size={14} color={colors.text} />
                                                        </Pressable>
                                                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text, minWidth: 18, textAlign: 'center' }}>
                                                            {selected[listing.id]}
                                                        </ThemedText>
                                                        <Pressable
                                                            onPress={() => setItemQuantity(listing.id, selected[listing.id] + 1)}
                                                            style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Ionicons name="add" size={14} color={colors.text} />
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <Ionicons name="ellipse-outline" size={22} color={colors.textSecondary} />
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}

                    {currentStepId === 'details' && (
                        <View style={{ gap: Spacing.four }}>
                            <FormField label="Título del paquete" required>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Ej. Paquete Fiesta Completa"
                                    placeholderTextColor={colors.textSecondary}
                                    style={inputStyle(colors)}
                                />
                            </FormField>
                            <FormField label="Descripción">
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Cuenta para qué tipo de evento es ideal este paquete..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={4}
                                    style={[inputStyle(colors), { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                                />
                            </FormField>
                        </View>
                    )}

                    {currentStepId === 'capacity' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.four }}>
                                ¿Para cuántas personas alcanza este paquete?
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                                <TextInput
                                    value={capacity}
                                    onChangeText={(v) => setCapacity(v.replace(/[^0-9]/g, ''))}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="number-pad"
                                    style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.text, flex: 1 }}
                                />
                                <ThemedText style={{ fontSize: 15, color: colors.textSecondary }}>personas</ThemedText>
                            </View>
                        </View>
                    )}

                    {currentStepId === 'photo' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.three }}>
                                {isEdit ? 'Toca la foto para cambiarla.' : 'Una foto que represente bien el paquete completo.'}
                            </ThemedText>
                            <Pressable
                                onPress={pickImage}
                                style={{
                                    width: '100%',
                                    aspectRatio: 4 / 3,
                                    borderRadius: Radius.lg,
                                    overflow: 'hidden',
                                    borderWidth: coverUri ? 0 : 2,
                                    borderColor: colors.border,
                                    borderStyle: 'dashed',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.backgroundElement,
                                }}
                            >
                                {coverUri ? (
                                    <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                ) : (
                                    <>
                                        <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                                        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: Spacing.two }}>
                                            Toca para elegir una foto
                                        </ThemedText>
                                    </>
                                )}
                            </Pressable>
                            {coverUri && (
                                <Pressable onPress={pickImage} style={{ marginTop: Spacing.three, alignSelf: 'center' }}>
                                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary }}>
                                        Cambiar foto
                                    </ThemedText>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {currentStepId === 'price' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.four }}>
                                ¿Cuánto cobras por día por el paquete completo?
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.text }}>$</ThemedText>
                                <TextInput
                                    value={dailyPrice}
                                    onChangeText={(v) => setDailyPrice(v.replace(/[^0-9.]/g, ''))}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="decimal-pad"
                                    style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.text, flex: 1 }}
                                />
                                <ThemedText style={{ fontSize: 15, color: colors.textSecondary }}>/día</ThemedText>
                            </View>
                        </View>
                    )}

                    {currentStepId === 'review' && (
                        <View>
                            <ThemedText style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.four }}>
                                {isEdit ? 'Así van a ver el paquete actualizado:' : 'Así lo van a ver tus clientes:'}
                            </ThemedText>
                            {renderPreviewCard()}
                            {error && (
                                <View style={{ marginTop: Spacing.four, backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2', borderRadius: Radius.lg, padding: Spacing.three }}>
                                    <ThemedText style={{ color: colors.destructive, fontSize: 13.5 }}>{error}</ThemedText>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                <View style={{ padding: Spacing.four, borderTopWidth: 1, borderColor: colors.border }}>
                    <Pressable
                        onPress={handleContinue}
                        disabled={!canContinue || publishing}
                        style={{
                            backgroundColor: canContinue ? colors.primary : colors.backgroundSelected,
                            paddingVertical: Spacing.three,
                            borderRadius: Radius.lg,
                            alignItems: 'center',
                        }}
                    >
                        {publishing ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: canContinue ? '#fff' : colors.textSecondary }}>
                                {step === STEPS.length - 1 ? (isEdit ? 'Guardar cambios' : 'Publicar paquete') : 'Continuar'}
                            </ThemedText>
                        )}
                    </Pressable>
                </View>

                <Modal visible={showPreview} animationType="slide" onRequestClose={() => setShowPreview(false)}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text }}>Vista previa</ThemedText>
                            <Pressable onPress={() => setShowPreview(false)} hitSlop={8}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: Spacing.four }}>
                            {renderPreviewCard()}
                            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.four }}>
                                Así se ve por ahora — sigue completando los pasos para publicar.
                            </ThemedText>
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    return (
        <View>
            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: Spacing.two }}>
                {label}{required && <ThemedText style={{ color: colors.destructive }}> *</ThemedText>}
            </ThemedText>
            {children}
        </View>
    );
}

function inputStyle(colors: any) {
    return {
        backgroundColor: colors.backgroundElement,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.three,
        paddingVertical: 13,
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: colors.text,
    };
}