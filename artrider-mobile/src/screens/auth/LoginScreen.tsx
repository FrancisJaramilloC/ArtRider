import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { BackButton } from '@/components/navigation/BackButton';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { PasswordField } from '@/components/ui/PasswordField';
import { Text } from '@/components/ui/Text';
import { MinTouch, Spacing } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useAuth } from '@/hooks/useAuth';
import { useCooldown } from '@/hooks/useCooldown';
import { RESEND_COOLDOWN_SECONDS, resendSignupEmail, type AuthErrorCode } from '@/services/authService';
import { email, required } from '@/utils/validation';

const RULES = {
    email: [required('Ingresa tu correo electrónico'), email()],
    password: [required('Ingresa tu contraseña')],
};

export function LoginScreen() {
    const { login } = useAuth();
    const router = useRouter();
    const form = useForm({ email: '', password: '' }, RULES);
    const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
    const [resending, setResending] = useState(false);
    const [resendNotice, setResendNotice] = useState<string | null>(null);
    const [resendError, setResendError] = useState<string | null>(null);
    const { remaining, start } = useCooldown();

    function handleSubmit() {
        form.submit(async (values) => {
            setErrorCode(null);
            setResendNotice(null);
            setResendError(null);
            const result = await login({ email: values.email.trim(), password: values.password });
            // Si fue exitoso, useAuth detecta la sesión nueva y el guard del _layout raíz redirige solo.
            setErrorCode(result.code ?? null);
            return result.error ?? null;
        });
    }

    async function handleResend() {
        if (resending || remaining > 0) return;
        setResending(true);
        setResendNotice(null);
        setResendError(null);
        const result = await resendSignupEmail(form.values.email.trim());
        setResending(false);
        if (result.error) {
            // Error propio del reenvío: su «Reintentar» repite el reenvío, no el inicio de sesión.
            setResendError(result.error);
            return;
        }
        setResendNotice('Te enviamos un nuevo enlace. Revisa tu correo.');
        start(RESEND_COOLDOWN_SECONDS);
    }

    // Credenciales inválidas y correo sin confirmar no mejoran al reintentar el login: sin «Reintentar».
    const canRetryLogin = errorCode === null || errorCode === 'unexpected';

    return (
        <AuthScreen scrollRef={form.scrollRef} onScroll={form.onScroll} centered>
            <BackButton style={{ alignSelf: 'flex-start' }} />

            <View style={{ marginBottom: Spacing.three, gap: Spacing.one }}>
                <Text variant="display" accessibilityRole="header">
                    Iniciar sesión
                </Text>
                <Text variant="body" color="textSecondary">
                    Bienvenido de vuelta a tu espacio creativo.
                </Text>
            </View>

            {form.submitError ? <FormErrorBanner message={form.submitError} onRetry={canRetryLogin ? form.retry : undefined} retrying={form.submitting} /> : null}
            {errorCode === 'email_not_confirmed' && form.submitError ? (
                <Button
                    label={remaining > 0 ? `Reenviar correo (${remaining} s)` : 'Reenviar correo'}
                    variant="secondary"
                    onPress={handleResend}
                    loading={resending}
                    disabled={remaining > 0}
                />
            ) : null}
            {resendError ? <FormErrorBanner message={resendError} onRetry={handleResend} retrying={resending} /> : null}
            {resendNotice ? (
                <Text variant="bodyStrong" color="primary" accessibilityLiveRegion="polite">
                    {resendNotice}
                </Text>
            ) : null}

            <FormField
                label="Correo electrónico"
                leftIcon="mail-outline"
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="username"
                autoCorrect={false}
                returnKeyType="next"
                submitBehavior="submit"
                maxLength={254}
                onSubmitEditing={() => form.field('password').inputRef.current?.focus()}
                {...form.field('email')}
            />

            <PasswordField
                label="Contraseña"
                placeholder="••••••••"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                maxLength={72}
                onSubmitEditing={handleSubmit}
                labelAccessory={
                    <Pressable
                        onPress={() => router.push('/forgot-password')}
                        accessibilityRole="link"
                        accessibilityLabel="¿Olvidaste tu contraseña?"
                        style={{ minHeight: MinTouch, justifyContent: 'center' }}
                    >
                        <Text variant="captionStrong" color="primary">
                            ¿La olvidaste?
                        </Text>
                    </Pressable>
                }
                {...form.field('password')}
            />

            <Button label="Iniciar sesión" onPress={handleSubmit} loading={form.submitting} />

            <View style={{ marginTop: Spacing.three, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="body" color="textSecondary">
                    ¿No tienes una cuenta?
                </Text>
                <Link href="/register" asChild>
                    <Pressable accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center', paddingHorizontal: Spacing.one }}>
                        <Text variant="bodyStrong" color="primary">
                            Regístrate
                        </Text>
                    </Pressable>
                </Link>
            </View>
        </AuthScreen>
    );
}
