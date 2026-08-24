import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Redirect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyProviderProfile, type ProviderProfile } from '@/services/providerService';
export default function ProviderTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getMyProviderProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!profile) {
    return <Redirect href="/(tabs)/profile" />;
  }
  if (profile.status !== 'active') {
    return <Redirect href="/become-provider" />;
  }
  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="today">
        <Label>Hoy</Label>
        <Icon sf="sun.max.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <Label>Calendario</Label>
        <Icon sf="calendar" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="listings">
        <Label>Anuncios</Label>
        <Icon sf="cube.box.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Label>Mensajes</Label>
        <Icon sf="message.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu">
        <Label>Menú</Label>
        <Icon sf="line.horizontal.3" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}