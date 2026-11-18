import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ColorSchemeProvider } from '@/contexts/ColorSchemeContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
SplashScreen.preventAutoHideAsync();
function RootNavigator() {
  const colorScheme = useColorScheme();
  const { session, loading: authLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    // Precarga la fuente de Ionicons junto con Inter: si se carga tarde, los chips
    // (ícono + texto) pueden pintar glifos de reemplazo en el primer frame.
    ...Ionicons.font,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const loading = authLoading || !fontsLoaded;
  if (loading) {
    return null;
  }
  SplashScreen.hideAsync();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(provider)" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="auth/confirm" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
export default function RootLayout() {
  return (
    <ColorSchemeProvider>
      <AuthProvider>
        <PricingProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </PricingProvider>
      </AuthProvider>
    </ColorSchemeProvider>
  );
}