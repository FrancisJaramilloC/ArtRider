import { useState } from 'react';
import { View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthDateField } from '@/components/ui/BirthDateField';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { MinTouch, Spacing } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { adult, email, maxLength, minLength, phone, required, sameAs } from '@/utils/validation';

const RULES = {
    firstName: [required('Ingresa tu nombre'), minLength(2, 'El nombre debe tener al menos 2 caracteres'), maxLength(50, 'El nombre admite hasta 50 caracteres')],
    lastName: [required('Ingresa tu apellido'), minLength(2, 'El apellido debe tener al menos 2 caracteres'), maxLength(50, 'El apellido admite hasta 50 caracteres')],
    email: [required('Ingresa tu correo electrónico'), email()],
    phone: [required('Ingresa tu teléfono de contacto'), phone()],
    birthDate: [required('Selecciona tu fecha de nacimiento'), adult()],
    password: [required('Crea una contraseña'), minLength(6, 'La contraseña debe tener al menos 6 caracteres')],
    confirmPassword: [required('Confirma tu contraseña'), sameAs('password', 'Las contraseñas no coinciden')],
};

export function RegisterScreen() {
    const { register } = useAuth();
    const colors = useTheme();
    const { gutter } = useLayout();
    const router = useRouter();

    const form = useForm({ firstName: '', lastName: '', email: '', phone: '', birthDate: '', password: '', confirmPassword: '' }, RULES);

    const [emailExists, setEmailExists] = useState(false);
    const birthField = form.field('birthDate');

    function handleSubmit() {
        form.submit(async (values) => {
            const result = await register({
                email: values.email.trim(),
                password: values.password,
                confirmPassword: values.confirmPassword,
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                phone: values.phone.trim(),
                birthDate: values.birthDate,
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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView ref={form.scrollRef} onScroll={form.onScroll} scrollEventThrottle={16} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center', gap: Spacing.three }}>
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
                            autoCapitalize="words"
                            returnKeyType="next"
                            maxLength={50}
                            onSubmitEditing={() => form.field('lastName').inputRef.current?.focus()}
                            {...form.field('firstName')}
                        />
                        <FormField
                            label="Apellido"
                            placeholder="Tu apellido"
                            autoComplete="family-name"
                            autoCapitalize="words"
                            returnKeyType="next"
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
                            autoCorrect={false}
                            returnKeyType="next"
                            maxLength={254}
                            onSubmitEditing={() => form.field('phone').inputRef.current?.focus()}
                            {...form.field('email')}
                        />
                        <FormField
                            label="Teléfono de contacto"
                            leftIcon="call-outline"
                            placeholder="+593 999 999 999"
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            maxLength={15}
                            {...form.field('phone')}
                        />

                        <BirthDateField
                            value={birthField.value}
                            onChange={birthField.onChangeText}
                            onBlur={birthField.onBlur}
                            error={birthField.error}
                            viewRef={form.viewRefFor('birthDate')}
                        />

                        <FormField
                            label="Contraseña"
                            leftIcon="lock-closed-outline"
                            placeholder="••••••••"
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
                            placeholder="••••••••"
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            returnKeyType="go"
                            maxLength={72}
                            onSubmitEditing={handleSubmit}
                            {...form.field('confirmPassword')}
                        />

                        <Button label="Crear cuenta" onPress={handleSubmit} loading={form.submitting} style={{ marginTop: Spacing.two }} />

                        <View style={{ marginTop: Spacing.four, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
