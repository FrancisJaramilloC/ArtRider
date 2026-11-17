import { View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SocialProvider = {
  key: 'apple' | 'google';
  /** Ej.: «Continuar con Apple». */
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

/**
 * Proveedores sociales disponibles. Está vacío a propósito: «Continuar con Apple» y «Continuar con
 * Google» se añaden aquí cuando exista su inicio de sesión; mientras tanto no se muestra nada.
 */
export const SOCIAL_PROVIDERS: readonly SocialProvider[] = [];

/** Hueco de la pantalla de entrada para los botones sociales: invisible mientras no haya proveedores. */
export function SocialAuthButtons() {
  const colors = useTheme();
  if (SOCIAL_PROVIDERS.length === 0) return null;

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text variant="caption" color="textSecondary">
          o
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      {SOCIAL_PROVIDERS.map((provider) => (
        <Button key={provider.key} label={provider.label} variant="secondary" icon={provider.icon} onPress={provider.onPress} />
      ))}
    </View>
  );
}
