import { useState } from 'react';
import {
    View,
    TextInput,
    Pressable,
    ActivityIndicator,
    useColorScheme,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function RegisterScreen() {
    const { register } = useAuth();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // Validación en vivo — igual que setCustomValidity() de la web
    const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

    async function handleSubmit() {
        setError(null);

        if (!birthDate) {
            setError('Por favor selecciona tu fecha de nacimiento.');
            return;
        }

        setLoading(true);
        const result = await register({
            email,
            password,
            confirmPassword,
            firstName,
            lastName,
            phone,
            birthDate: formatDateForInput(birthDate),
        });
        setLoading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        // register() ya cerró la sesión automáticamente (decisión del item 004).
        // Mostramos confirmación y mandamos a login manual, igual que la web.
        setSuccess(true);
        setTimeout(() => router.replace('/login'), 1500);
    }

    const isFormValid =
        firstName && lastName && email && phone && birthDate && password && confirmPassword && !passwordsMismatch;

    const inputStyle = {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: Spacing.two,
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: colors.text,
    } as const;

    const fieldWrapperStyle = {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.backgroundElement,
        borderRadius: Radius.xl,
        paddingHorizontal: Spacing.three,
    };

    const labelStyle = {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: colors.text,
        marginBottom: Spacing.one,
    } as const;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={{ padding: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
                        {/* Header */}
                        <View style={{ marginBottom: Spacing.four }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.text, marginBottom: Spacing.one }}>
                                Crear cuenta
                            </ThemedText>
                            <ThemedText style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.textSecondary }}>
                                Únete a la comunidad de ArtRider hoy.
                            </ThemedText>
                        </View>

                        {/* Success banner */}
                        {success && (
                            <View
                                style={{
                                    backgroundColor: scheme === 'dark' ? 'rgba(74,222,128,0.15)' : '#f0fdf4',
                                    borderRadius: Radius.lg,
                                    padding: Spacing.three,
                                    marginBottom: Spacing.three,
                                }}
                            >
                                <ThemedText style={{ color: '#4ade80', fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                                    ¡Cuenta creada! Redirigiendo a inicio de sesión...
                                </ThemedText>
                            </View>
                        )}

                        {/* Error banner */}
                        {error && (
                            <View
                                style={{
                                    backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2',
                                    borderRadius: Radius.lg,
                                    padding: Spacing.three,
                                    marginBottom: Spacing.three,
                                    flexDirection: 'row',
                                    gap: Spacing.two,
                                    alignItems: 'flex-start',
                                }}
                            >
                                <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                                <ThemedText style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 14, flex: 1 }}>
                                    {error}
                                </ThemedText>
                            </View>
                        )}

                        {/* Nombre y Apellido */}
                        <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three }}>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={labelStyle}>Nombre</ThemedText>
                                <View style={fieldWrapperStyle}>
                                    <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                                    <TextInput
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="Tu nombre"
                                        placeholderTextColor={colors.textSecondary}
                                        maxLength={50}
                                        style={inputStyle}
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={labelStyle}>Apellido</ThemedText>
                                <View style={fieldWrapperStyle}>
                                    <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                                    <TextInput
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholder="Tu apellido"
                                        placeholderTextColor={colors.textSecondary}
                                        maxLength={50}
                                        style={inputStyle}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Email */}
                        <View style={{ marginBottom: Spacing.three }}>
                            <ThemedText style={labelStyle}>Correo electrónico</ThemedText>
                            <View style={fieldWrapperStyle}>
                                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="tu@email.com"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    maxLength={254}
                                    style={inputStyle}
                                />
                            </View>
                        </View>

                        {/* Teléfono */}
                        <View style={{ marginBottom: Spacing.three }}>
                            <ThemedText style={labelStyle}>Teléfono de contacto</ThemedText>
                            <View style={fieldWrapperStyle}>
                                <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="+593 999 999 999"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                    style={inputStyle}
                                />
                            </View>
                        </View>

                        {/* Fecha de nacimiento */}
                        <View style={{ marginBottom: Spacing.three }}>
                            <ThemedText style={labelStyle}>Fecha de nacimiento</ThemedText>
                            <Pressable onPress={() => setShowDatePicker(true)} style={fieldWrapperStyle}>
                                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                                <View style={inputStyle}>
                                    <ThemedText style={{ color: birthDate ? colors.text : colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 15 }}>
                                        {birthDate ? formatDateForDisplay(birthDate) : 'Selecciona una fecha'}
                                    </ThemedText>
                                </View>
                            </Pressable>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={birthDate ?? new Date(2000, 0, 1)}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    maximumDate={new Date()}
                                    onChange={(event, selectedDate) => {
                                        setShowDatePicker(Platform.OS === 'ios'); // iOS: spinner queda abierto hasta que el usuario confirme
                                        if (selectedDate) setBirthDate(selectedDate);
                                    }}
                                />
                            )}
                        </View>

                        {/* Contraseña */}
                        <View style={{ marginBottom: Spacing.three }}>
                            <ThemedText style={labelStyle}>Contraseña</ThemedText>
                            <View style={fieldWrapperStyle}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    maxLength={72}
                                    style={inputStyle}
                                />
                            </View>
                        </View>

                        {/* Confirmar contraseña */}
                        <View style={{ marginBottom: Spacing.two }}>
                            <ThemedText style={labelStyle}>Confirmar contraseña</ThemedText>
                            <View
                                style={[
                                    fieldWrapperStyle,
                                    passwordsMismatch ? { borderWidth: 1, borderColor: colors.destructive } : null,
                                ]}
                            >
                                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    maxLength={72}
                                    style={inputStyle}
                                />
                            </View>
                            {passwordsMismatch && (
                                <ThemedText style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: Spacing.one }}>
                                    Las contraseñas no coinciden
                                </ThemedText>
                            )}
                        </View>

                        {/* Submit */}
                        <Pressable
                            onPress={handleSubmit}
                            disabled={loading || !isFormValid}
                            style={({ pressed }) => ({
                                backgroundColor: loading || !isFormValid ? colors.backgroundSelected : colors.primary,
                                borderRadius: Radius.xl,
                                paddingVertical: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: pressed ? 0.9 : 1,
                                marginTop: Spacing.two,
                            })}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' }}>
                                    Crear cuenta
                                </ThemedText>
                            )}
                        </Pressable>

                        {/* Footer */}
                        <View style={{ marginTop: Spacing.five, alignItems: 'center' }}>
                            <ThemedText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textSecondary }}>
                                ¿Ya tienes una cuenta?{' '}
                                <Link href="/login">
                                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.primary }}>
                                        Inicia sesión
                                    </ThemedText>
                                </Link>
                            </ThemedText>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}