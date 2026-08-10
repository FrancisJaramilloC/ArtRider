import { View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

export default function ProviderCalendarScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five }}>
        <ThemedText type="title" style={{ marginBottom: Spacing.two }}>Calendario</ThemedText>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          Aquí verás las reservas recibidas y podrás gestionar la disponibilidad de tus equipos. Próximamente.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}
