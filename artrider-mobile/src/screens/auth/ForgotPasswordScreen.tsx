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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/services/supabase';

const REDIRECT_URL = 'artridermobile://reset-password';

export function ForgotPasswordScreen() {
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function handleSubmit() {
        setError(null);
        setLoading(true);
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: REDIRECT_URL,
        });
        setLoading(false);

        if (err) {
            setError('No se pudo enviar el correo. Verifica tu email e intenta de nuevo.');
            return;
        }
        setSent(true);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
                        <BackButton style={{ marginBottom: Spacing.four, alignSelf: 'flex-start' }} />

                        {sent ? (
                            <View style={{ alignItems: 'center' }}>
                                <View
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 32,
                                        backgroundColor: `${colors.primary}15`,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: Spacing.four,
                                    }}
                                >
                                    <Ionicons name="mail-outline" size={28} color={colors.primary} />
                                </View>
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text, marginBottom: Spacing.two, textAlign: 'center' }}>
                                    Revisa tu correo
                                </ThemedText>
                                <ThemedText style={{ fontSize: 14.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 }}>
                                    Te enviamos un enlace a {email} para restablecer tu contraseña.
                                </ThemedText>
                                <Pressable onPress={() => router.back()} style={{ marginTop: Spacing.five }}>
                                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.primary }}>
                                        Volver a iniciar sesión
                                    </ThemedText>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                <View style={{ marginBottom: Spacing.five }}>
                                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.text, marginBottom: Spacing.one }}>
                                        ¿Olvidaste tu contraseña?
                                    </ThemedText>
                                    <ThemedText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textSecondary }}>
                                        Ingresa tu correo y te mandamos un enlace para restablecerla.
                                    </ThemedText>
                                </View>

                                {error && (
                                    <View
                                        style={{
                                            backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2',
                                            borderRadius: Radius.lg,
                                            padding: Spacing.three,
                                            marginBottom: Spacing.four,
                                        }}
                                    >
                                        <ThemedText style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 14 }}>
                                            {error}
                                        </ThemedText>
                                    </View>
                                )}

                                <View style={{ marginBottom: Spacing.four }}>
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
                                            style={{ flex: 1, paddingVertical: 14, paddingHorizontal: Spacing.two, fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.text }}
                                        />
                                    </View>
                                </View>

                                <Pressable
                                    onPress={handleSubmit}
                                    disabled={loading || !email}
                                    style={({ pressed }) => ({
                                        backgroundColor: loading || !email ? colors.backgroundSelected : colors.primary,
                                        borderRadius: Radius.xl,
                                        paddingVertical: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: pressed ? 0.9 : 1,
                                    })}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' }}>
                                            Enviar enlace
                                        </ThemedText>
                                    )}
                                </Pressable>
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}