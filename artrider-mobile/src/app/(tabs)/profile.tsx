import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ProtectedScreen } from '@/components/protected-screen';

export default function ProfileScreen() {
    return (
        <ProtectedScreen>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText type="title">Perfil</ThemedText>
            </View>
        </ProtectedScreen>
    );
}