import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ProtectedScreen } from '@/components/protected-screen';

export default function MessagesScreen() {
    return (
        <ProtectedScreen>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText type="title">Mensajes</ThemedText>
            </View>
        </ProtectedScreen>
    );
}