import { useCallback, useRef, useState } from 'react';
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

  // Si ya se leyó el estado alguna vez, un fallo de red NO lo cambia (no pasa de «en revisión» a «Ser Partner»).
  const statusKnown = useRef(false);

  const loadPartnerStatus = useCallback(() => {
    let cancelled = false;
    getMyProviderProfile()
      .then((p) => {
        if (cancelled) return;
        statusKnown.current = true;
        setPartnerStatus(p?.status ?? null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Esperado (sin red, permisos): solo aviso en desarrollo, sin cuadro rojo.
        if (__DEV__) console.warn('[perfil] no se pudo leer el estado de Partner:', error instanceof Error ? error.message : error);
        if (!statusKnown.current) setPartnerStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Se relee al volver a la pestaña: tras enviar la solicitud la fila pasa a «Solicitud en revisión».
  useFocusEffect(loadPartnerStatus);

  return (
    <ProtectedScreen>
      <AccountMenu
        title="Perfil"
        fullName={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        onOpenProfile={() => router.push('/profile/edit' as never)}
        onLogout={async () => {
          await logout();
          router.replace('/welcome');
        }}
      >
        <ListSection title="Mis cosas">
          <ListRow icon="heart-outline" label="Favoritos" onPress={() => router.push('/favorites' as never)} />
        </ListSection>

        <ListSection title="Negocio">
          <PartnerRow
            status={partnerStatus}
            onPress={(status) => {
              if (status === 'unavailable') loadPartnerStatus(); // reintenta leer el estado
              else if (status === 'active') router.replace('/(provider)/today');
              else router.push('/become-provider');
            }}
          />
        </ListSection>

        <ListSection title="Soporte">
          <ListRow icon="help-circle-outline" label="Ayuda y soporte" onPress={() => Linking.openURL('mailto:soporte@artrider.com')} />
        </ListSection>
      </AccountMenu>
    </ProtectedScreen>
  );
}
