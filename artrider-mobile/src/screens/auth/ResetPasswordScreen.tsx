import { useEffect, useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, useColorScheme, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/services/supabase';

export function ResetPasswordScreen() {
    const { code } = useLocalSearchParams<{ code?: string }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [exchanging, setExchanging] = useState(true);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        async function exchange() {
            if (!code) {
                setLinkError('Este enlace no es válido o ya expiró. Solicita uno nuevo.');
                setExchanging(false);
                return;
            }
            const { error: err } = await supabase.auth.exchangeCodeForSession(code);
            if (err) {
                setLinkError('Este enlace ya expiró o ya fue usado. Solicita uno nuevo.');
            }
            setExchanging(false);
        }
        exchange();
    }, [code]);

    async function handleSubmit() {
        setError(null);
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        const { error: err } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (err) {
            setError('No se pudo actualizar la contraseña. Intenta de nuevo.');
            return;
        }
        setSuccess(true);
        setTimeout(() => {
            router.replace('/');
        }, 1500);
    }

    if (exchanging) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (linkError) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
                <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} style={{ marginBottom: Spacing.three }} />
                <ThemedText style={{ fontSize: 15, color: colors.text, textAlign: 'center', marginBottom: Spacing.four }}>
                    {linkError}
                </ThemedText>
                <Pressable onPress={() => router.replace('/login')}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.primary }}>
                        Volver a iniciar sesión
                    </ThemedText>
                </Pressable>
            </SafeAreaView>
        );
    }

    if (success) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
                <Ionicons name="checkmark-circle" size={40} color={colors.primary} style={{ marginBottom: Spacing.three }} />
                <ThemedText style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.text, textAlign: 'center' }}>
                    Contraseña actualizada
                </ThemedText>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
                        <View style={{ marginBottom: Spacing.five }}>
                            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.text, marginBottom: Spacing.one }}>
                                Nueva contraseña
                            </ThemedText>
                            <ThemedText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textSecondary }}>
                                Elige una contraseña nueva para tu cuenta.
                            </ThemedText>
                        </View>

                        {error && (
                            <View style={{ backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2', borderRadius: Radius.lg, padding: Spacing.three, marginBottom: Spacing.four }}>
                                <ThemedText style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 14 }}>{error}</ThemedText>
                            </View>
                        )}

                        <View style={{ marginBottom: Spacing.three }}>
                            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text, marginBottom: Spacing.two }}>
                                Nueva contraseña
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundElement, borderRadius: Radius.xl, paddingHorizontal: Spacing.three }}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    maxLength={72}
                                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: Spacing.two, fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.text }}
                                />
                            </View>
                        </View>

                        <View style={{ marginBottom: Spacing.four }}>
                            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text, marginBottom: Spacing.two }}>
                                Confirmar contraseña
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundElement, borderRadius: Radius.xl, paddingHorizontal: Spacing.three }}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    maxLength={72}
                                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: Spacing.two, fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.text }}
                                />
                            </View>
                        </View>

                        <Pressable
                            onPress={handleSubmit}
                            disabled={loading || !password || !confirmPassword}
                            style={({ pressed }) => ({
                                backgroundColor: loading || !password || !confirmPassword ? colors.backgroundSelected : colors.primary,
                                borderRadius: Radius.xl,
                                paddingVertical: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: pressed ? 0.9 : 1,
                            })}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' }}>
                                    Actualizar contraseña
                                </ThemedText>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}