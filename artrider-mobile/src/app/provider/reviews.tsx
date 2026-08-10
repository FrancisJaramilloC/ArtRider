import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';

export default function ProviderReviewsPlaceholder() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: Spacing.four }}><BackButton /></View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
                <ThemedText type="title">Reseñas</ThemedText>
                <ThemedText>Próximamente</ThemedText>
            </View>
        </SafeAreaView>
    );
}