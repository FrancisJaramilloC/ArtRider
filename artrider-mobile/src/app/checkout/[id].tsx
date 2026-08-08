import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export default function CheckoutPlaceholder() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ThemedText type="title">Checkout</ThemedText>
            <ThemedText>Próximamente — item 017 del backlog</ThemedText>
        </View>
    );
}