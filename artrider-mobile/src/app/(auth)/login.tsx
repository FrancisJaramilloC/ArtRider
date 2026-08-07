import { View } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';

export default function LoginScreen() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <ThemedText type="title">Login</ThemedText>
            <Link href="/register">
                <ThemedText>¿No tienes cuenta? Regístrate</ThemedText>
            </Link>
        </View>
    );
}