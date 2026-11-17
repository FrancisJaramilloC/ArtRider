import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { BackButton } from '@/components/navigation/BackButton';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { MinTouch, Spacing } from '@/constants/theme';

/** Entrada a la cuenta: «Inicia sesión o regístrate». Los botones de Apple y Google se añaden en `SocialAuthButtons`. */
export function WelcomeScreen() {
    const router = useRouter();

    return (
        <AuthScreen centered>
            <BackButton fallbackHref="/" style={{ alignSelf: 'flex-start' }} />

            <View style={{ gap: Spacing.one, marginVertical: Spacing.three }}>
                <Text variant="display" accessibilityRole="header">
                    Inicia sesión o regístrate
                </Text>
                <Text variant="body" color="textSecondary">
                    Reserva equipos para tu próxima producción o ofrece los tuyos como Partner.
                </Text>
            </View>

            <Button label="Continuar con correo" icon="mail-outline" onPress={() => router.push('/register')} />

            <SocialAuthButtons />

            <View style={{ marginTop: Spacing.three, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: Spacing.four }}>
                <Pressable onPress={() => router.push('/login')} accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center' }}>
                    <Text variant="bodyStrong" color="primary">
                        Iniciar sesión
                    </Text>
                </Pressable>
                <Pressable onPress={() => router.push('/register')} accessibilityRole="link" style={{ minHeight: MinTouch, justifyContent: 'center' }}>
                    <Text variant="bodyStrong" color="primary">
                        Crear cuenta
                    </Text>
                </Pressable>
            </View>
        </AuthScreen>
    );
}
