import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Image, Linking, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ProtectedScreen } from '@/components/protected-screen';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getMyProviderProfile } from '@/services/providerService';

function MenuItem({ icon, label, onPress, colors, destructive }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
      }}
    >
      <Ionicons name={icon} size={20} color={destructive ? colors.destructive : colors.text} />
      <ThemedText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14.5, color: destructive ? colors.destructive : colors.text }}>
        {label}
      </ThemedText>
      {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}

function SectionLabel({ children, colors }: { children: string; colors: any }) {
  return (
    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.3, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: Spacing.one, marginTop: Spacing.five }}>
      {children}
    </ThemedText>
  );
}

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [isProvider, setIsProvider] = useState(false);

  useEffect(() => {
    getMyProviderProfile().then((p) => setIsProvider(p?.status === 'active'));
  }, []);

  return (
    <ProtectedScreen>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: Spacing.four, paddingBottom: Spacing.six }}>
          <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.text, marginBottom: Spacing.five }}>
            Perfil
          </ThemedText>

          <Pressable
            onPress={() => router.push('/profile/edit' as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.three,
              backgroundColor: colors.backgroundElement,
              borderRadius: Radius.lg,
              padding: Spacing.four,
            }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textSecondary }}>
                  {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
                </ThemedText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>
                {profile?.full_name ?? 'Tu perfil'}
              </ThemedText>
              <ThemedText style={{ fontSize: 12.5, color: colors.primary, marginTop: 2 }}>Ver perfil</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <SectionLabel colors={colors}>Negocio</SectionLabel>
          <MenuItem
            icon="storefront-outline"
            label={isProvider ? 'Cambiar a modo proveedor' : 'Conviértete en proveedor'}
            onPress={() => (isProvider ? router.replace('/(provider)/today') : router.push('/become-provider'))}
            colors={colors}
          />

          <SectionLabel colors={colors}>Soporte</SectionLabel>
          <MenuItem
            icon="help-circle-outline"
            label="Ayuda y soporte"
            onPress={() => Linking.openURL('mailto:soporte@artrider.com')}
            colors={colors}
          />

          <View style={{ height: Spacing.five, borderBottomWidth: 1, borderColor: colors.border, marginTop: Spacing.four }} />

          <View style={{ marginTop: Spacing.two }}>
            <MenuItem
              icon="log-out-outline"
              label="Cerrar sesión"
              onPress={() => logout()}
              colors={colors}
              destructive
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedScreen>
  );
}