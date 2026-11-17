import { COPY } from '@/constants/copy';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';

import { AccountMenu } from '@/components/account/AccountMenu';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { useAuth } from '@/hooks/useAuth';

export function ProviderMenuScreen() {
  const router = useRouter();
  const { profile, logout } = useAuth();

  async function handleLogout() {
    // Sale del grupo (provider) ANTES de limpiar la sesión — evita la
    // carrera entre el guard de (provider)/_layout y el redirect del
    // layout raíz que causaba el bug al cerrar sesión en este modo.
    router.replace('/(tabs)');
    await logout();
  }

  return (
    <AccountMenu
      title="Menú"
      fullName={profile?.full_name}
      avatarUrl={profile?.avatar_url}
      onOpenProfile={() => router.push('/profile/edit' as never)}
      onLogout={handleLogout}
    >
      <ListSection title="Mi negocio">
        <ListRow icon="star-outline" label="Reseñas" onPress={() => router.push('/provider/reviews')} />
        <ListRow icon="settings-outline" label="Configuración del negocio" onPress={() => router.push('/provider/settings')} />
      </ListSection>

      <ListSection title="Cuenta">
        <ListRow icon="swap-horizontal-outline" label={COPY.switchToClientMode} onPress={() => router.replace('/(tabs)')} />
      </ListSection>

      <ListSection title="Soporte">
        <ListRow icon="help-circle-outline" label="Ayuda y soporte" onPress={() => Linking.openURL('mailto:soporte@artrider.com')} />
      </ListSection>
    </AccountMenu>
  );
}
