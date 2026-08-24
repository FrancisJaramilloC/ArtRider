import { useState } from 'react';
import { View, TextInput, Pressable, Image, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/profileService';

export function EditProfileScreen() {
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { profile, refreshProfile } = useAuth();

    const [fullName, setFullName] = useState(profile?.full_name ?? '');
    const [phone, setPhone] = useState(profile?.phone ?? '');
    const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
    const [avatarMime, setAvatarMime] = useState<string | null>(null);
    const [avatarChanged, setAvatarChanged] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function pickImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
        });
        if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
            setAvatarMime(result.assets[0].mimeType ?? 'image/jpeg');
            setAvatarChanged(true);
        }
    }

    async function handleSave() {
        setError(null);
        setSuccess(false);
        if (!fullName.trim() || !phone.trim()) {
            setError('Completa tu nombre y teléfono.');
            return;
        }
        setSaving(true);
        const result = await updateProfile({
            fullName,
            phone,
            avatarUri: avatarChanged && avatarUri ? avatarUri : undefined,
            avatarMimeType: avatarChanged ? (avatarMime ?? undefined) : undefined,
        });
        setSaving(false);

        if (result.error) {
            setError(result.error);
            return;
        }
        await refreshProfile();
        setSuccess(true);
        setTimeout(() => router.back(), 700);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ padding: Spacing.four }} keyboardShouldPersistTaps="handled">
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.five }}>
                        <BackButton />
                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.text }}>Editar perfil</ThemedText>
                        <View style={{ width: 24 }} />
                    </View>

                    <Pressable onPress={pickImage} style={{ alignSelf: 'center', marginBottom: Spacing.five }}>
                        <View style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: colors.backgroundElement, alignItems: 'center', justifyContent: 'center' }}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.textSecondary }}>
                                    {(fullName || '?').charAt(0).toUpperCase()}
                                </ThemedText>
                            )}
                        </View>
                        <View
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: colors.background,
                            }}
                        >
                            <Ionicons name="camera" size={14} color="#fff" />
                        </View>
                    </Pressable>

                    <View style={{ marginBottom: Spacing.three }}>
                        <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: Spacing.two }}>
                            Nombre completo
                        </ThemedText>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Tu nombre"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.backgroundElement,
                                borderRadius: Radius.lg,
                                paddingHorizontal: Spacing.three,
                                paddingVertical: 13,
                                fontSize: 15,
                                color: colors.text,
                            }}
                        />
                    </View>

                    <View style={{ marginBottom: Spacing.four }}>
                        <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: Spacing.two }}>
                            Teléfono
                        </ThemedText>
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="099 123 4567"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="phone-pad"
                            style={{
                                backgroundColor: colors.backgroundElement,
                                borderRadius: Radius.lg,
                                paddingHorizontal: Spacing.three,
                                paddingVertical: 13,
                                fontSize: 15,
                                color: colors.text,
                            }}
                        />
                    </View>

                    {error && (
                        <View style={{ backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2', borderRadius: Radius.lg, padding: Spacing.three, marginBottom: Spacing.three }}>
                            <ThemedText style={{ color: colors.destructive, fontSize: 13.5 }}>{error}</ThemedText>
                        </View>
                    )}
                    {success && (
                        <View style={{ backgroundColor: scheme === 'dark' ? 'rgba(34,197,94,0.15)' : '#f0fdf4', borderRadius: Radius.lg, padding: Spacing.three, marginBottom: Spacing.three }}>
                            <ThemedText style={{ color: '#16a34a', fontSize: 13.5 }}>¡Perfil actualizado!</ThemedText>
                        </View>
                    )}

                    <Pressable
                        onPress={handleSave}
                        disabled={saving}
                        style={{ backgroundColor: colors.primary, paddingVertical: Spacing.three, borderRadius: Radius.lg, alignItems: 'center' }}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : (
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' }}>Guardar cambios</ThemedText>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}