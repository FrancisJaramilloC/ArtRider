import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { MinTouch, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { hasAuthCredentials, parseAuthLink, type AuthLinkParams } from '@/services/authLink';
import { supabase } from '@/services/supabase';

/** Espera máxima a que llegue algún dato en el enlace antes de darlo por inválido. */
const LINK_WAIT_MS = 2500;

const EXPIRED_MESSAGE = 'Este enlace ya expiró o ya fue usado. Inicia sesión o reenvía el correo de confirmación.';

async function establishSession(link: AuthLinkParams): Promise<string | null> {
    if (link.error) return EXPIRED_MESSAGE;
    if (link.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(link.code);
        return error ? EXPIRED_MESSAGE : null;
    }
    if (link.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: 'signup' });
        return error ? EXPIRED_MESSAGE : null;
    }
    if (link.accessToken && link.refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
        return error ? EXPIRED_MESSAGE : null;
    }
    return 'Este enlace no es válido. Inicia sesión o reenvía el correo de confirmación.';
}

/** Destino del enlace de confirmación de correo (`artridermobile://auth/confirm`). */
export function ConfirmEmailScreen() {
    const params = useLocalSearchParams<{ code?: string; token_hash?: string; type?: string; error_description?: string; error?: string }>();
    const url = Linking.useLinkingURL();
    const router = useRouter();
    const colors = useTheme();
    const { gutter } = useLayout();
    const { showToast } = useToast();
    const [failure, setFailure] = useState<string | null>(null);
    const handled = useRef(false);

    // El fragmento (#access_token=…) no llega como parámetro de ruta: se lee de la URL completa.
    const link: AuthLinkParams = {
        ...parseAuthLink(url),
        ...(params.code ? { code: params.code } : {}),
        ...(params.token_hash ? { tokenHash: params.token_hash } : {}),
        ...(params.error_description || params.error ? { error: params.error_description ?? params.error } : {}),
    };
    const ready = hasAuthCredentials(link);
    const linkKey = JSON.stringify(link);

    useEffect(() => {
        if (handled.current) return;
        if (!ready) {
            const timer = setTimeout(() => {
                if (!handled.current) setFailure('Este enlace no es válido. Inicia sesión o reenvía el correo de confirmación.');
            }, LINK_WAIT_MS);
            return () => clearTimeout(timer);
        }
        handled.current = true;
        (async () => {
            try {
                const message = await establishSession(link);
                if (message) {
                    setFailure(message);
                    return;
                }
                showToast('Cuenta verificada');
                router.replace('/');
            } catch {
                setFailure('No pudimos validar el enlace. Revisa tu conexión e intenta de nuevo.');
            }
        })();
        // `link` se resume en `linkKey`; showToast y router son estables.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, linkKey]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: gutter, paddingVertical: Spacing.four, gap: Spacing.three }}>
            {failure ? (
                <>
                    <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
                    <Text variant="body" style={{ textAlign: 'center' }} accessibilityRole="alert">
                        {failure}
                    </Text>
                    <Pressable onPress={() => router.replace('/login')} accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center' }}>
                        <Text variant="bodyStrong" color="primary">
                            Ir a iniciar sesión
                        </Text>
                    </Pressable>
                </>
            ) : (
                <>
                    <ActivityIndicator color={colors.primary} />
                    <Text variant="body" color="textSecondary">
                        Verificando tu cuenta…
                    </Text>
                </>
            )}
        </SafeAreaView>
    );
}
