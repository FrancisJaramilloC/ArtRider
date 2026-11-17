import { useState } from 'react';
import { View, Pressable, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/navigation/BackButton';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/profileService';
import { maxLength, minLength, phone, required } from '@/utils/validation';

const RULES = {
    fullName: [required('Ingresa tu nombre completo'), minLength(2, 'El nombre debe tener al menos 2 caracteres'), maxLength(100, 'El nombre admite hasta 100 caracteres')],
    phone: [phone('Ingresa un teléfono válido, por ejemplo 099 123 4567')],
};

export function EditProfileScreen() {
    const { gutter } = useLayout();
    const router = useRouter();
    const colors = useTheme();
    const { profile, refreshProfile } = useAuth();

    const form = useForm({ fullName: profile?.full_name ?? '', phone: profile?.phone ?? '' }, RULES);
    const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
    const [avatarMime, setAvatarMime] = useState<string | null>(null);
    const [avatarChanged, setAvatarChanged] = useState(false);
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

    function handleSave() {
        setSuccess(false);
        form.submit(async (values) => {
            const result = await updateProfile({
                fullName: values.fullName,
                phone: values.phone,
                avatarUri: avatarChanged && avatarUri ? avatarUri : undefined,
                avatarMimeType: avatarChanged ? (avatarMime ?? undefined) : undefined,
            });
            if (result.error) return result.error;
            await refreshProfile();
            setSuccess(true);
            setTimeout(() => router.back(), 700);
            return null;
        });
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView ref={form.scrollRef} onScroll={form.onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: gutter, paddingVertical: Spacing.four, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three }}>
                        <BackButton />
                        <Text variant="subtitle" accessibilityRole="header">
                            Editar perfil
                        </Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <Pressable
                        onPress={pickImage}
                        accessibilityRole="button"
                        accessibilityLabel="Cambiar foto de perfil"
                        style={{ alignSelf: 'center', marginBottom: Spacing.three }}
                    >
                        <View style={{ width: 96, height: 96, borderRadius: Radius.full, overflow: 'hidden', backgroundColor: colors.backgroundElement, alignItems: 'center', justifyContent: 'center' }}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                                <Text variant="display" color="textSecondary">
                                    {(form.values.fullName || '?').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <View
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 30,
                                height: 30,
                                borderRadius: Radius.full,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: colors.background,
                            }}
                        >
                            <Ionicons name="camera" size={14} color={colors.onPrimary} />
                        </View>
                    </Pressable>

                    {form.submitError ? <FormErrorBanner message={form.submitError} onRetry={form.retry} retrying={form.submitting} /> : null}

                    <FormField
                        label="Nombre completo"
                        placeholder="Tu nombre"
                        autoComplete="name"
                        autoCapitalize="words"
                        returnKeyType="next"
                        maxLength={100}
                        onSubmitEditing={() => form.field('phone').inputRef.current?.focus()}
                        {...form.field('fullName')}
                    />
                    <FormField
                        label="Teléfono"
                        placeholder="099 123 4567"
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        maxLength={15}
                        {...form.field('phone')}
                    />

                    {success ? (
                        <View accessibilityRole="alert" style={{ backgroundColor: colors.primarySoft, borderRadius: Radius.lg, padding: Spacing.three }}>
                            <Text variant="bodyStrong" color="primary">
                                ¡Perfil actualizado!
                            </Text>
                        </View>
                    ) : null}

                    <Button label="Guardar cambios" onPress={handleSave} loading={form.submitting} disabled={success} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
