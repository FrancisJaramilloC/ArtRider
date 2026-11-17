import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useRouter, Link } from 'expo-router';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { BackButton } from '@/components/navigation/BackButton';
import { Button } from '@/components/ui/Button';
import { CheckboxRow } from '@/components/ui/CheckboxRow';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { PasswordField, PasswordRequirements } from '@/components/ui/PasswordField';
import { Text } from '@/components/ui/Text';
import { LEGAL_URLS } from '@/constants/legal';
import { MinTouch, Spacing } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useAuth } from '@/hooks/useAuth';
import { email, maxLength, minLength, required, strongPassword } from '@/utils/validation';

const TERMS_REQUIRED = 'Debes confirmar que tienes 18 años o más y aceptar los Términos y la Política de Privacidad';

const RULES = {
    firstName: [required('Ingresa tu nombre'), minLength(2, 'El nombre debe tener al menos 2 caracteres'), maxLength(50, 'El nombre admite hasta 50 caracteres')],
    lastName: [required('Ingresa tu apellido'), minLength(2, 'El apellido debe tener al menos 2 caracteres'), maxLength(50, 'El apellido admite hasta 50 caracteres')],
    email: [required('Ingresa tu correo electrónico'), email()],
    password: [required('Crea una contraseña'), strongPassword('La contraseña debe tener al menos 8 caracteres, una letra y un número')],
    terms: [required(TERMS_REQUIRED)],
};

/** Abre un documento legal; si no hay navegador disponible no hace nada (el enlace es informativo). */
function openLegal(url: string) {
    Linking.openURL(url).catch(() => {});
}

export function RegisterScreen() {
    const { register } = useAuth();
    const router = useRouter();

    const form = useForm({ firstName: '', lastName: '', email: '', password: '', terms: '' }, RULES);
    const [emailExists, setEmailExists] = useState(false);
    const termsField = form.field('terms');

    function handleSubmit() {
        form.submit(async (values) => {
            const result = await register({
                email: values.email.trim(),
                password: values.password,
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                acceptedTerms: values.terms === '1',
            });
            setEmailExists(result.code === 'email_exists');
            if (result.error) return result.error;

            // Con «Confirm email» activo no hay sesión: se pide verificar el correo. Con sesión,
            // el guard del layout raíz lleva a Home.
            if (result.needsVerification) {
                router.replace({ pathname: '/verify-email', params: { email: values.email.trim() } });
            }
            return null;
        });
    }

    return (
        <AuthScreen scrollRef={form.scrollRef} onScroll={form.onScroll}>
            <BackButton style={{ alignSelf: 'flex-start' }} />

            <View style={{ marginBottom: Spacing.two, gap: Spacing.one }}>
                <Text variant="display" accessibilityRole="header">
                    Crear cuenta
                </Text>
                <Text variant="body" color="textSecondary">
                    Únete a la comunidad de ArtRider hoy.
                </Text>
            </View>

            {form.submitError && emailExists ? (
                // Correo ya registrado: reintentar no sirve; se ofrece iniciar sesión o recuperar la contraseña.
                <FormErrorBanner message={form.submitError}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three }}>
                        <Pressable onPress={() => router.replace('/login')} accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center' }}>
                            <Text variant="bodyStrong" color="primary">
                                Iniciar sesión
                            </Text>
                        </Pressable>
                        <Pressable onPress={() => router.push('/forgot-password')} accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center' }}>
                            <Text variant="bodyStrong" color="primary">
                                ¿Olvidaste tu contraseña?
                            </Text>
                        </Pressable>
                    </View>
                </FormErrorBanner>
            ) : form.submitError ? (
                <FormErrorBanner message={form.submitError} onRetry={form.retry} retrying={form.submitting} />
            ) : null}

            <FormField
                label="Nombre"
                placeholder="Tu nombre"
                autoComplete="given-name"
                textContentType="givenName"
                autoCapitalize="words"
                returnKeyType="next"
                submitBehavior="submit"
                maxLength={50}
                onSubmitEditing={() => form.field('lastName').inputRef.current?.focus()}
                {...form.field('firstName')}
            />
            <FormField
                label="Apellido"
                placeholder="Tu apellido"
                autoComplete="family-name"
                textContentType="familyName"
                autoCapitalize="words"
                returnKeyType="next"
                submitBehavior="submit"
                maxLength={50}
                onSubmitEditing={() => form.field('email').inputRef.current?.focus()}
                {...form.field('lastName')}
            />
            <FormField
                label="Correo electrónico"
                leftIcon="mail-outline"
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                returnKeyType="next"
                submitBehavior="submit"
                maxLength={254}
                onSubmitEditing={() => form.field('password').inputRef.current?.focus()}
                {...form.field('email')}
            />
            <View style={{ gap: Spacing.two }}>
                <PasswordField
                    label="Contraseña"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    passwordRules="minlength: 8; required: lower; required: digit;"
                    returnKeyType="done"
                    maxLength={72}
                    {...form.field('password')}
                />
                <PasswordRequirements value={form.values.password} />
            </View>

            <CheckboxRow
                checked={termsField.value === '1'}
                onChange={(next) => termsField.onChangeText(next ? '1' : '')}
                error={termsField.error}
                viewRef={form.viewRefFor('terms')}
                accessibilityLabel="Confirmo que tengo 18 años o más y acepto los Términos y la Política de Privacidad"
            >
                Confirmo que tengo 18 años o más y acepto los{' '}
                <Text variant="bodyStrong" color="primary" accessibilityRole="link" onPress={() => openLegal(LEGAL_URLS.terms)}>
                    Términos
                </Text>{' '}
                y la{' '}
                <Text variant="bodyStrong" color="primary" accessibilityRole="link" onPress={() => openLegal(LEGAL_URLS.privacy)}>
                    Política de Privacidad
                </Text>
                .
            </CheckboxRow>

            <Button label="Crear cuenta" onPress={handleSubmit} loading={form.submitting} style={{ marginTop: Spacing.two }} />

            <View style={{ marginTop: Spacing.three, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="body" color="textSecondary">
                    ¿Ya tienes una cuenta?
                </Text>
                <Link href="/login" asChild>
                    <Pressable accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center', paddingHorizontal: Spacing.one }}>
                        <Text variant="bodyStrong" color="primary">
                            Inicia sesión
                        </Text>
                    </Pressable>
                </Link>
            </View>
        </AuthScreen>
    );
}
