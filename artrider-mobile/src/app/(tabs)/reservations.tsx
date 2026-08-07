import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ProtectedScreen } from '@/components/protected-screen';

export default function ReservationsScreen() {
    return (
        <ProtectedScreen>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText type="title">Mis Reservas</ThemedText>
            </View>
        </ProtectedScreen>
    );
}