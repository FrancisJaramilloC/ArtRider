import { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { MinTouch, Spacing } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';
import { minLength, required, sameAs } from '@/utils/validation';

const RULES = {
    password: [required('Crea una contraseña nueva'), minLength(6, 'La contraseña debe tener al menos 6 caracteres')],
    confirmPassword: [required('Confirma tu contraseña'), sameAs('password', 'Las contraseñas no coinciden')],
};

export function ResetPasswordScreen() {
    const { code } = useLocalSearchParams<{ code?: string }>();
    const router = useRouter();
    const colors = useTheme();
    const { gutter } = useLayout();

    const [exchanging, setExchanging] = useState(true);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const form = useForm({ password: '', confirmPassword: '' }, RULES);

    useEffect(() => {
        async function exchange() {
            if (!code) {
                setLinkError('Este enlace no es válido o ya expiró. Solicita uno nuevo.');
                setExchanging(false);
                return;
            }
            try {
                const { error: err } = await supabase.auth.exchangeCodeForSession(code);
                if (err) setLinkError('Este enlace ya expiró o ya fue usado. Solicita uno nuevo.');
            } catch {
                setLinkError('No pudimos validar el enlace. Revisa tu conexión y solicita uno nuevo.');
            } finally {
                setExchanging(false);
            }
        }
        exchange();
    }, [code]);

    function handleSubmit() {
        form.submit(async (values) => {
            const { error: err } = await supabase.auth.updateUser({ password: values.password });
            if (err) return 'No se pudo actualizar la contraseña. Intenta de nuevo.';
            setSuccess(true);
            setTimeout(() => router.replace('/'), 1500);
            return null;
        });
    }

    if (exchanging) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (linkError) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: gutter, paddingVertical: Spacing.four, gap: Spacing.three }}>
                <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
                <Text variant="body" style={{ textAlign: 'center' }}>
                    {linkError}
                </Text>
                <Pressable onPress={() => router.replace('/login')} accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center' }}>
                    <Text variant="bodyStrong" color="primary">
                        Volver a iniciar sesión
                    </Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    if (success) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: gutter, paddingVertical: Spacing.four, gap: Spacing.three }}>
                <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
                <Text variant="subtitle" style={{ textAlign: 'center' }}>
                    Contraseña actualizada
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView ref={form.scrollRef} onScroll={form.onScroll} scrollEventThrottle={16} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: gutter, maxWidth: 480, width: '100%', alignSelf: 'center', gap: Spacing.three }}>
                        <View style={{ marginBottom: Spacing.three, gap: Spacing.one }}>
                            <Text variant="display" accessibilityRole="header">
                                Nueva contraseña
                            </Text>
                            <Text variant="body" color="textSecondary">
                                Elige una contraseña nueva para tu cuenta.
                            </Text>
                        </View>

                        {form.submitError ? <FormErrorBanner message={form.submitError} onRetry={form.retry} retrying={form.submitting} /> : null}

                        <FormField
                            label="Nueva contraseña"
                            leftIcon="lock-closed-outline"
                            placeholder="Tu contraseña"
                            hint="Mínimo 6 caracteres."
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            returnKeyType="next"
                            maxLength={72}
                            onSubmitEditing={() => form.field('confirmPassword').inputRef.current?.focus()}
                            {...form.field('password')}
                        />
                        <FormField
                            label="Confirmar contraseña"
                            leftIcon="lock-closed-outline"
                            placeholder="Tu contraseña"
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            returnKeyType="go"
                            maxLength={72}
                            onSubmitEditing={handleSubmit}
                            {...form.field('confirmPassword')}
                        />

                        <Button label="Actualizar contraseña" onPress={handleSubmit} loading={form.submitting} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
