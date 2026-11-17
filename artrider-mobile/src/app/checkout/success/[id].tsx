import { COPY } from '@/constants/copy';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { Text } from '@/components/ui/Text';
import { Radius, StatusColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export default function CheckoutSuccessScreen() {
    const { id, listingTitle, from, to, total } = useLocalSearchParams<{
        id: string;
        listingTitle: string;
        from: string;
        to: string;
        total: string;
    }>();
    const router = useRouter();
    const colors = useTheme();
    const scheme = useColorScheme();
    const { gutter, contentWidth } = useLayout();
    const success = StatusColors[scheme === 'dark' ? 'dark' : 'light'].confirmed;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: gutter,
                    gap: Spacing.three,
                    width: '100%',
                    maxWidth: contentWidth,
                    alignSelf: 'center',
                }}
            >
                <View style={{ width: 80, height: 80, borderRadius: Radius.full, backgroundColor: success.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={40} color={success.fg} />
                </View>

                <Text variant="title" style={{ textAlign: 'center' }} accessibilityRole="header">
                    ¡Solicitud enviada!
                </Text>
                <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
                    {COPY.checkoutSuccessNote}
                </Text>

                <View style={{ alignSelf: 'stretch', backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two, marginTop: Spacing.two }}>
                    <Text variant="subtitle" numberOfLines={2}>
                        {listingTitle}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                        {from} → {to}
                    </Text>
                    <Text variant="caption" color="textMuted">
                        Reserva #{id.slice(0, 8)}
                    </Text>
                    <View style={{ marginTop: Spacing.two }}>
                        <PriceSummary lines={[]} totalLabel="Total pagado" total={`$${(Number(total) / 100).toFixed(2)}`} />
                    </View>
                </View>
            </View>

            <StickyFooter>
                <Button label="Ver mis reservas" onPress={() => router.replace('/(tabs)/reservations')} />
            </StickyFooter>
        </SafeAreaView>
    );
}
