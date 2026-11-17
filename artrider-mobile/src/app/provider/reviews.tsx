import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/hooks/use-theme';

export default function ProviderReviewsPlaceholder() {
  const colors = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Reseñas" />
      <EmptyState
        fill
        icon="star-outline"
        title="Próximamente"
        description="Aquí verás las reseñas que dejan tus clientes."
        actionLabel="Volver al menú"
        onAction={() => router.back()}
      />
    </SafeAreaView>
  );
}
