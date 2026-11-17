import { Pressable, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { MinTouch, Spacing } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { email, required } from '@/utils/validation';

const RULES = {
    email: [required('Ingresa tu correo electrónico'), email()],
    password: [required('Ingresa tu contraseña')],
};

export function LoginScreen() {
    const { login } = useAuth();
    const colors = useTheme();
    const { gutter } = useLayout();
    const router = useRouter();
    const form = useForm({ email: '', password: '' }, RULES);

    function handleSubmit() {
        form.submit(async (values) => {
            const result = await login({ email: values.email.trim(), password: values.password });
            // Si fue exitoso, useAuth detecta la sesión nueva y el guard del _layout raíz redirige solo.
            return result.error ?? null;
        });
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView ref={form.scrollRef} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: gutter, maxWidth: 480, width: '100%', alignSelf: 'center', gap: Spacing.three }}>
                        <View style={{ marginBottom: Spacing.three, gap: Spacing.one }}>
                            <Text variant="display" accessibilityRole="header">
                                Iniciar sesión
                            </Text>
                            <Text variant="body" color="textSecondary">
                                Bienvenido de vuelta a tu espacio creativo.
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
                            returnKeyType="next"
                            maxLength={254}
                            onSubmitEditing={() => form.field('password').inputRef.current?.focus()}
                            {...form.field('email')}
                        />

                        <FormField
                            label="Contraseña"
                            leftIcon="lock-closed-outline"
                            placeholder="••••••••"
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="current-password"
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

                        <View style={{ marginTop: Spacing.four, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
