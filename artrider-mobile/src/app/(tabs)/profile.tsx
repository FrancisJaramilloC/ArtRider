import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AccountMenu } from '@/components/account/AccountMenu';
import { PartnerRow, type PartnerRowStatus } from '@/components/account/PartnerRow';
import { ProtectedScreen } from '@/components/protected-screen';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { useAuth } from '@/hooks/useAuth';
import { getMyProviderProfile } from '@/services/providerService';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [partnerStatus, setPartnerStatus] = useState<PartnerRowStatus>(null);

  // Se relee al volver a la pestaña: tras enviar la solicitud la fila pasa a «Solicitud en revisión».
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMyProviderProfile()
        .then((p) => !cancelled && setPartnerStatus(p?.status ?? null))
        .catch(() => !cancelled && setPartnerStatus(null));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ProtectedScreen>
      <AccountMenu
        title="Perfil"
        fullName={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        onOpenProfile={() => router.push('/profile/edit' as never)}
        onLogout={() => logout()}
      >
        <ListSection title="Mis cosas">
          <ListRow icon="heart-outline" label="Favoritos" onPress={() => router.push('/favorites' as never)} />
        </ListSection>

        <ListSection title="Negocio">
          <PartnerRow
            status={partnerStatus}
            onPress={(status) => (status === 'active' ? router.replace('/(provider)/today') : router.push('/become-provider'))}
          />
        </ListSection>

        <ListSection title="Soporte">
          <ListRow icon="help-circle-outline" label="Ayuda y soporte" onPress={() => Linking.openURL('mailto:soporte@artrider.com')} />
        </ListSection>
      </AccountMenu>
    </ProtectedScreen>
  );
}
