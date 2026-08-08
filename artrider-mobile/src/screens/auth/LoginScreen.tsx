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
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Radius } from '@/constants/theme';

export function LoginScreen() {
    const { login } = useAuth();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        setError(null);
        setLoading(true);
        const result = await login({ email, password });
        setLoading(false);

        if (result.error) {
            setError(result.error);
        }
        // Si fue exitoso, useAuth detecta la sesión nueva automáticamente y
        // el guard del _layout raíz redirige solo a (tabs) — no hace falta
        // navegar manualmente desde aquí.
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{ paddingHorizontal: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
                        {/* Header */}
                        <View style={{ marginBottom: Spacing.five }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.text, marginBottom: Spacing.one }}>
                                Iniciar sesión
                            </ThemedText>
                            <ThemedText style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.textSecondary }}>
                                Bienvenido de vuelta a tu espacio creativo.
                            </ThemedText>
                        </View>

                        {/* Error banner */}
                        {error && (
                            <View
                                style={{
                                    backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2',
                                    borderWidth: 1,
                                    borderColor: scheme === 'dark' ? 'rgba(248,113,113,0.3)' : '#fee2e2',
                                    borderRadius: Radius.lg,
                                    padding: Spacing.three,
                                    marginBottom: Spacing.four,
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

                        {/* Email */}
                        <View style={{ marginBottom: Spacing.three }}>
                            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text, marginBottom: Spacing.two }}>
                                Correo electrónico
                            </ThemedText>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.backgroundElement,
                                    borderRadius: Radius.xl,
                                    paddingHorizontal: Spacing.three,
                                }}
                            >
                                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="tu@email.com"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    maxLength={254}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 14,
                                        paddingHorizontal: Spacing.two,
                                        fontSize: 15,
                                        fontFamily: 'Inter_400Regular',
                                        color: colors.text,
                                    }}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={{ marginBottom: Spacing.four }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two }}>
                                <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text }}>
                                    Contraseña
                                </ThemedText>
                                <Pressable onPress={() => { }}>
                                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.primary }}>
                                        ¿La olvidaste?
                                    </ThemedText>
                                </Pressable>
                            </View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.backgroundElement,
                                    borderRadius: Radius.xl,
                                    paddingHorizontal: Spacing.three,
                                }}
                            >
                                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    maxLength={72}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 14,
                                        paddingHorizontal: Spacing.two,
                                        fontSize: 15,
                                        fontFamily: 'Inter_400Regular',
                                        color: colors.text,
                                    }}
                                />
                            </View>
                        </View>

                        {/* Submit */}
                        <Pressable
                            onPress={handleSubmit}
                            disabled={loading || !email || !password}
                            style={({ pressed }) => ({
                                backgroundColor: loading || !email || !password ? colors.backgroundSelected : colors.primary,
                                borderRadius: Radius.xl,
                                paddingVertical: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: pressed ? 0.9 : 1,
                                flexDirection: 'row',
                                gap: Spacing.two,
                            })}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' }}>
                                    Iniciar sesión
                                </ThemedText>
                            )}
                        </Pressable>

                        {/* Footer */}
                        <View style={{ marginTop: Spacing.five, alignItems: 'center' }}>
                            <ThemedText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textSecondary }}>
                                ¿No tienes una cuenta?{' '}
                                <Link href="/register">
                                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.primary }}>
                                        Regístrate
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