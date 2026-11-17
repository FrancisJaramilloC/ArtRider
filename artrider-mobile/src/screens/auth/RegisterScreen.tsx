import { useState } from 'react';
import { View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/ui/Button';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Spacing, FieldHeight } from '@/constants/theme';
import { useForm } from '@/hooks/useForm';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { adult, email, maxLength, minLength, phone, required, sameAs } from '@/utils/validation';

function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

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
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [success, setSuccess] = useState(false);

    const birthDate = form.values.birthDate ? new Date(`${form.values.birthDate}T00:00:00`) : null;
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
            if (result.error) return result.error;

            // register() ya cerró la sesión automáticamente (decisión del item 004).
            // Mostramos confirmación y mandamos a login manual, igual que la web.
            setSuccess(true);
            setTimeout(() => router.replace('/login'), 1500);
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

                        {success ? (
                            <View accessibilityRole="alert" style={{ backgroundColor: colors.primarySoft, borderRadius: Radius.lg, padding: Spacing.three }}>
                                <Text variant="bodyStrong" color="primary">
                                    ¡Cuenta creada! Redirigiendo a inicio de sesión...
                                </Text>
                            </View>
                        ) : null}

                        {form.submitError ? <FormErrorBanner message={form.submitError} onRetry={form.retry} retrying={form.submitting} /> : null}

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

                        {/* Fecha de nacimiento: selector (no es un campo de texto) con el mismo estilo de error. */}
                        <View ref={form.viewRefFor('birthDate')} style={{ gap: Spacing.two }}>
                            <Text variant="bodyStrong">Fecha de nacimiento</Text>
                            <Pressable
                                onPress={() => setShowDatePicker(true)}
                                accessibilityRole="button"
                                accessibilityLabel="Fecha de nacimiento"
                                accessibilityValue={{ text: birthDate ? formatDateForDisplay(birthDate) : 'Sin seleccionar' }}
                                accessibilityHint={birthField.error ?? 'Abre el selector de fecha'}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: Spacing.two,
                                    minHeight: FieldHeight,
                                    backgroundColor: colors.backgroundElement,
                                    borderRadius: Radius.xl,
                                    borderWidth: 1.5,
                                    borderColor: birthField.error ? colors.destructive : 'transparent',
                                    paddingHorizontal: Spacing.three,
                                }}
                            >
                                <Ionicons name="calendar-outline" size={18} color={birthField.error ? colors.destructive : colors.textSecondary} />
                                <Text variant="body" color={birthDate ? 'text' : 'textSecondary'} style={{ flex: 1 }}>
                                    {birthDate ? formatDateForDisplay(birthDate) : 'Selecciona una fecha'}
                                </Text>
                            </Pressable>
                            {birthField.error ? (
                                <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }}>
                                    <Ionicons name="alert-circle" size={16} color={colors.destructive} style={{ marginTop: Spacing.half }} />
                                    <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }}>
                                        {birthField.error}
                                    </Text>
                                </View>
                            ) : null}
                            {showDatePicker && (
                                <DateTimePicker
                                    value={birthDate ?? new Date(2000, 0, 1)}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    maximumDate={new Date()}
                                    onChange={(_event, selectedDate) => {
                                        setShowDatePicker(Platform.OS === 'ios'); // iOS: el spinner queda abierto hasta confirmar
                                        if (selectedDate) {
                                            birthField.onChangeText(formatDateForInput(selectedDate));
                                            if (Platform.OS !== 'ios') birthField.onBlur();
                                        }
                                    }}
                                />
                            )}
                        </View>

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

                        <Button label="Crear cuenta" onPress={handleSubmit} loading={form.submitting} disabled={success} style={{ marginTop: Spacing.two }} />

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
