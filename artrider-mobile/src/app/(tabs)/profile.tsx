import { View, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ProtectedScreen } from '@/components/protected-screen';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <ProtectedScreen>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: Spacing.four }}>
        <ThemedText type="title" style={{ marginBottom: Spacing.five }}>Perfil</ThemedText>

        <Pressable
          onPress={() => router.push('/become-provider')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            backgroundColor: colors.backgroundElement,
            borderRadius: Radius.lg,
            padding: Spacing.four,
            marginBottom: Spacing.three,
          }}
        >
          <Ionicons name="storefront-outline" size={22} color={colors.primary} />
          <ThemedText style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text }}>
            Conviértete en proveedor
          </ThemedText>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => logout()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            padding: Spacing.four,
          }}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
          <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.destructive }}>
            Cerrar sesión
          </ThemedText>
        </Pressable>
      </View>
    </ProtectedScreen>
  );
}