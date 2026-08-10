import { View, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, type ThemeColor } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: Record<ThemeColor, string>;
  destructive?: boolean;
};

function MenuItem({ icon, label, onPress, colors, destructive }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
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
      <Ionicons name={icon} size={22} color={destructive ? colors.destructive : colors.primary} />
      <ThemedText style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: destructive ? colors.destructive : colors.text }}>
        {label}
      </ThemedText>
      {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}

export function ProviderMenuScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { profile, logout } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: Spacing.four }}>
        <ThemedText type="title" style={{ marginBottom: Spacing.one }}>
          {profile?.full_name ?? 'Menú'}
        </ThemedText>
        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginBottom: Spacing.five }}>
          Modo proveedor
        </ThemedText>

        <MenuItem icon="star-outline" label="Reseñas" onPress={() => router.push('/provider/reviews')} colors={colors} />
        <MenuItem icon="settings-outline" label="Configuración" onPress={() => router.push('/provider/settings')} colors={colors} />
        <MenuItem icon="swap-horizontal-outline" label="Cambiar a modo cliente" onPress={() => router.replace('/(tabs)')} colors={colors} />
        <MenuItem icon="log-out-outline" label="Cerrar sesión" onPress={() => logout()} colors={colors} destructive />
      </View>
    </SafeAreaView>
  );
}
