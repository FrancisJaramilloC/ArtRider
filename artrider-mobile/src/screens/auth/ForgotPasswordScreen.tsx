import { Pressable, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/navigation/BackButton';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';
import { email as emailRule, required } from '@/utils/validation';

const REDIRECT_URL = 'artridermobile://reset-password';

const RULES = {
    email: [required('Ingresa tu correo electrónico'), emailRule()],
};

export function ForgotPasswordScreen() {
    const router = useRouter();
    const colors = useTheme();
    const { gutter } = useLayout();
    const form = useForm({ email: '' }, RULES);
    const [sentTo, setSentTo] = useState<string | null>(null);

    function handleSubmit() {
        form.submit(async (values) => {
            const address = values.email.trim();
            const { error: err } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: REDIRECT_URL });
            if (err) return 'No se pudo enviar el correo. Verifica tu email e intenta de nuevo.';
            setSentTo(address);
            return null;
        });
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView ref={form.scrollRef} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: gutter, maxWidth: 480, width: '100%', alignSelf: 'center', gap: Spacing.three }}>
                        <BackButton style={{ marginBottom: Spacing.two, alignSelf: 'flex-start' }} />

                        {sentTo ? (
                            <View style={{ alignItems: 'center', gap: Spacing.three }}>
                                <View style={{ width: 64, height: 64, borderRadius: Radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="mail-outline" size={28} color={colors.primary} />
                                </View>
                                <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
                                    Revisa tu correo
                                </Text>
                                <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
                                    Te enviamos un enlace a {sentTo} para restablecer tu contraseña.
                                </Text>
                                <Pressable onPress={() => router.back()} accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center', marginTop: Spacing.two }}>
                                    <Text variant="bodyStrong" color="primary">
                                        Volver a iniciar sesión
                                    </Text>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                <View style={{ marginBottom: Spacing.three, gap: Spacing.one }}>
                                    <Text variant="display" accessibilityRole="header">
                                        ¿Olvidaste tu contraseña?
                                    </Text>
                                    <Text variant="body" color="textSecondary">
                                        Ingresa tu correo y te mandamos un enlace para restablecerla.
                                    </Text>
                                </View>

                                {form.submitError ? <FormErrorBanner message={form.submitError} onRetry={form.retry} retrying={form.submitting} /> : null}

                                <FormField
                                    label="Correo electrónico"
                                    leftIcon="mail-outline"
                                    placeholder="tu@email.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    autoCorrect={false}
                                    returnKeyType="send"
                                    maxLength={254}
                                    onSubmitEditing={handleSubmit}
                                    {...form.field('email')}
                                />

                                <Button label="Enviar enlace" onPress={handleSubmit} loading={form.submitting} />
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
