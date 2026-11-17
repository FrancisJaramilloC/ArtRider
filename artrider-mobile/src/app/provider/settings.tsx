import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/hooks/use-theme';

export default function ProviderSettingsPlaceholder() {
  const colors = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Configuración" />
      <EmptyState
        fill
        icon="settings-outline"
        title="Próximamente"
        description="Estamos preparando la configuración de tu negocio."
        actionLabel="Volver al menú"
        onAction={() => router.back()}
      />
    </SafeAreaView>
  );
}
