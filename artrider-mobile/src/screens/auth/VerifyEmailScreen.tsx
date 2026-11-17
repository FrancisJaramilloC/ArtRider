import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { useCooldown } from '@/hooks/useCooldown';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { RESEND_COOLDOWN_SECONDS, resendSignupEmail, verifySignupCode } from '@/services/authService';
import { supabase } from '@/services/supabase';

/** Código numérico del correo ({{ .Token }}): 6 a 8 dígitos según la configuración de Supabase. */
const CODE_PATTERN = /^\d{6,8}$/;

/** Abre la app de correo: iOS `message://` (bandeja de Mail), y `mailto:` como alternativa o en el resto. */
async function openMailApp(): Promise<void> {
    if (Platform.OS === 'ios') {
        try {
            await Linking.openURL('message://');
            return;
        } catch {
            // Sin app de correo asociada a message://: se intenta mailto:.
        }
    }
    try {
        await Linking.openURL('mailto:');
    } catch {
        // Sin cliente de correo configurado: no hay nada más que abrir.
    }
}

/** Pantalla posterior al registro: pide abrir el enlace del correo (o escribir el código) para activar la cuenta. */
export function VerifyEmailScreen() {
    const { email } = useLocalSearchParams<{ email?: string }>();
    const router = useRouter();
    const colors = useTheme();
    const { gutter } = useLayout();
    const { showToast } = useToast();
    // El correo se acaba de enviar al registrarse: el cooldown arranca activo.
    const { remaining, start } = useCooldown(RESEND_COOLDOWN_SECONDS);
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [codeOpen, setCodeOpen] = useState(false);
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    const address = email ?? '';
    const canResend = !!address && remaining === 0 && !sending;

    // Al confirmar (enlace o código) Supabase emite SIGNED_IN: entramos a Home sin pasar por Login.
    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                showToast('Cuenta verificada');
                router.replace('/');
            }
        });
        return () => data.subscription.unsubscribe();
    }, [router, showToast]);

    async function handleResend() {
        if (!canResend) return;
        setSending(true);
        setError(null);
        setNotice(null);
        const result = await resendSignupEmail(address);
        setSending(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        setNotice('Te enviamos un nuevo enlace.');
        start(RESEND_COOLDOWN_SECONDS);
    }

    async function handleVerifyCode() {
        if (verifying) return;
        const trimmed = code.trim();
        if (!CODE_PATTERN.test(trimmed)) {
            setCodeError('Ingresa el código de 6 a 8 dígitos del correo.');
            return;
        }
        setVerifying(true);
        setCodeError(null);
        const result = await verifySignupCode(address, trimmed);
        setVerifying(false);
        // Si fue bien, el listener de SIGNED_IN navega a Home.
        if (result.error) setCodeError(result.error);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center', gap: Spacing.three }}>
                        <View style={{ alignItems: 'center', gap: Spacing.three }}>
                            <View style={{ width: 64, height: 64, borderRadius: Radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="mail-outline" size={28} color={colors.primary} />
                            </View>
                            <Text variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>
                                Revisa tu correo
                            </Text>
                            <View style={{ gap: Spacing.one }}>
                                {address ? (
                                    <Text variant="bodyStrong" style={{ textAlign: 'center' }}>
                                        {address}
                                    </Text>
                                ) : null}
                                <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
                                    Abre el enlace que te enviamos para activar tu cuenta.
                                </Text>
                            </View>
                        </View>

                        {error ? <FormErrorBanner message={error} onRetry={handleResend} retrying={sending} /> : null}
                        {notice ? (
                            <Text variant="bodyStrong" color="primary" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
                                {notice}
                            </Text>
                        ) : null}

                        <Button label="Abrir correo" onPress={openMailApp} />
                        <Button
                            label={remaining > 0 ? `Reenviar enlace (${remaining} s)` : 'Reenviar enlace'}
                            variant="secondary"
                            onPress={handleResend}
                            loading={sending}
                            disabled={!canResend}
                        />

                        {codeOpen ? (
                            <View style={{ gap: Spacing.three }}>
                                <FormField
                                    label="Código del correo"
                                    leftIcon="keypad-outline"
                                    placeholder="123456"
                                    hint="Si tu correo incluye un código, escríbelo aquí."
                                    keyboardType="number-pad"
                                    textContentType="oneTimeCode"
                                    autoComplete="one-time-code"
                                    maxLength={8}
                                    value={code}
                                    onChangeText={(next) => {
                                        setCode(next.replace(/\D/g, ''));
                                        setCodeError(null);
                                    }}
                                    error={codeError}
                                    returnKeyType="go"
                                    onSubmitEditing={handleVerifyCode}
                                />
                                <Button label="Confirmar código" variant="tonal" onPress={handleVerifyCode} loading={verifying} />
                            </View>
                        ) : (
                            <Pressable
                                onPress={() => setCodeOpen(true)}
                                accessibilityRole="button"
                                style={{ minHeight: MinTouch, justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Text variant="bodyStrong" color="primary">
                                    Tengo un código
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={() => router.replace('/register')}
                            accessibilityRole="link"
                            style={{ minHeight: MinTouch, justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text variant="bodyStrong" color="primary">
                                Cambiar correo
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
