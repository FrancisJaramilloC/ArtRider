import { useEffect, useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ProtectedScreen } from '@/components/protected-screen';
import { Avatar } from '@/components/ui/Avatar';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useColorSchemeContext } from '@/contexts/ColorSchemeContext';
import { useAuth } from '@/hooks/useAuth';
import { getMyProviderProfile } from '@/services/providerService';

function AppearanceToggle() {
  const { colorScheme, setOverride } = useColorSchemeContext();
  return (
    <SegmentedControl
      options={[
        { value: 'light', label: 'Claro' },
        { value: 'dark', label: 'Oscuro' },
      ]}
      value={colorScheme}
      onChange={setOverride}
    />
  );
}

export default function ProfileScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [isProvider, setIsProvider] = useState(false);

  useEffect(() => {
    getMyProviderProfile().then((p) => setIsProvider(p?.status === 'active'));
  }, []);

  return (
    <ProtectedScreen>
      <Screen scroll tabBar>
        <Text variant="title" accessibilityRole="header" style={{ paddingTop: Spacing.three, paddingBottom: Spacing.four }}>
          Perfil
        </Text>

        <Pressable
          onPress={() => router.push('/profile/edit' as never)}
          accessibilityRole="button"
          accessibilityLabel={`${profile?.full_name ?? 'Tu perfil'}. Ver perfil`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            backgroundColor: colors.backgroundElement,
            borderRadius: Radius.card,
            padding: Spacing.four,
          }}
        >
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={56} />
          <View style={{ flex: 1, gap: Spacing.half }}>
            <Text variant="subtitle" numberOfLines={1}>
              {profile?.full_name ?? 'Tu perfil'}
            </Text>
            <Text variant="caption" color="primary">
              Ver perfil
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <ListSection title="Apariencia">
          <AppearanceToggle />
        </ListSection>

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

        <View style={{ borderTopWidth: 1, borderColor: colors.border, marginTop: Spacing.four, paddingTop: Spacing.two }}>
          <ListRow icon="log-out-outline" label="Cerrar sesión" onPress={() => logout()} destructive />
        </View>
      </Screen>
    </ProtectedScreen>
  );
}
