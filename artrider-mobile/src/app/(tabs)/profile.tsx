import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';

import { AccountMenu } from '@/components/account/AccountMenu';
import { ProtectedScreen } from '@/components/protected-screen';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { useAuth } from '@/hooks/useAuth';
import { getMyProviderProfile } from '@/services/providerService';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [isProvider, setIsProvider] = useState(false);

  useEffect(() => {
    getMyProviderProfile().then((p) => setIsProvider(p?.status === 'active'));
  }, []);

  return (
    <ProtectedScreen>
      <AccountMenu
        title="Perfil"
        fullName={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        onOpenProfile={() => router.push('/profile/edit' as never)}
        onLogout={() => logout()}
      >
        <ListSection title="Negocio">
          <ListRow
            icon="storefront-outline"
            label={isProvider ? 'Cambiar a modo proveedor' : 'Conviértete en proveedor'}
            onPress={() => (isProvider ? router.replace('/(provider)/today') : router.push('/become-provider'))}
          />
        </ListSection>

        <ListSection title="Soporte">
          <ListRow icon="help-circle-outline" label="Ayuda y soporte" onPress={() => Linking.openURL('mailto:soporte@artrider.com')} />
        </ListSection>
      </AccountMenu>
    </ProtectedScreen>
  );
}
