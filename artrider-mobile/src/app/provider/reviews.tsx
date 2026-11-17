import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';

export default function ProviderReviewsPlaceholder() {
  const { gutter } = useLayout();
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four }}><BackButton /></View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: gutter, paddingVertical: Spacing.four }}>
                <ThemedText type="title">Reseñas</ThemedText>
                <ThemedText>Próximamente</ThemedText>
            </View>
        </SafeAreaView>
    );
}