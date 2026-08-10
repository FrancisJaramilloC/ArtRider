import { useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getMyProviderProfile, type ProviderProfile } from '@/services/providerService';

const STATUS_MESSAGE: Record<ProviderProfile['status'], string> = {
  pending: 'Tu solicitud está siendo revisada. Te notificaremos cuando tu cuenta esté activa (1-3 días hábiles).',
  active: 'Tu cuenta de proveedor está activa. Ya puedes gestionar tu catálogo.',
  suspended: 'Tu cuenta de proveedor ha sido suspendida. Contacta a soporte para más información.',
};

export function ProviderTodayScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProviderProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          No tienes un perfil de proveedor todavía.
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: Spacing.four }}>
        <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text, marginBottom: Spacing.one }}>
          Hola, {profile.brand_name}
        </ThemedText>
        <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginBottom: Spacing.four }}>
          {STATUS_MESSAGE[profile.status]}
        </ThemedText>

        <View
          style={{
            backgroundColor: colors.backgroundElement,
            borderRadius: Radius.lg,
            padding: Spacing.four,
          }}
        >
          <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 }}>
            El resumen de reservas y actividad reciente estará disponible próximamente.
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}
