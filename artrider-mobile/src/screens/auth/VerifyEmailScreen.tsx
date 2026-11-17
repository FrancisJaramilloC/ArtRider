import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { FormErrorBanner } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useCooldown } from '@/hooks/useCooldown';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { RESEND_COOLDOWN_SECONDS, resendSignupEmail } from '@/services/authService';

/** Pantalla posterior al registro: pide confirmar el correo y permite reenviar el enlace. */
export function VerifyEmailScreen() {
    const { email } = useLocalSearchParams<{ email?: string }>();
    const router = useRouter();
    const colors = useTheme();
    const { gutter } = useLayout();
    // El correo se acaba de enviar al registrarse: el cooldown arranca activo.
    const { remaining, start } = useCooldown(RESEND_COOLDOWN_SECONDS);
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const address = email ?? '';
    const canResend = !!address && remaining === 0 && !sending;

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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center', alignItems: 'center', gap: Spacing.three }}>
                    <View style={{ width: 64, height: 64, borderRadius: Radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="mail-outline" size={28} color={colors.primary} />
                    </View>
                    <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
                        Verifica tu correo
                    </Text>
                    <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
                        {address ? `Te enviamos un enlace a ${address}. Ábrelo para activar tu cuenta.` : 'Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta.'}
                    </Text>

                    {error ? (
                        <View style={{ alignSelf: 'stretch' }}>
                            <FormErrorBanner message={error} />
                        </View>
                    ) : null}
                    {notice ? (
                        <Text variant="bodyStrong" color="primary" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
                            {notice}
                        </Text>
                    ) : null}

                    <Button
                        label={remaining > 0 ? `Reenviar correo (${remaining} s)` : 'Reenviar correo'}
                        variant="secondary"
                        onPress={handleResend}
                        loading={sending}
                        disabled={!canResend}
                    />
                    <Button label="Ya confirmé, iniciar sesión" onPress={() => router.replace('/login')} />

                    <Pressable onPress={() => router.replace('/register')} accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center' }}>
                        <Text variant="bodyStrong" color="primary">
                            Cambiar correo
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
