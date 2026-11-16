import { View } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

export type AvatarProps = {
  uri?: string | null;
  /** Nombre para las iniciales y la etiqueta de accesibilidad. */
  name?: string | null;
  size?: number;
};

function initialsOf(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

/** Avatar circular: foto con caché o iniciales sobre el acento tenue. */
export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const colors = useTheme();
  const radius = size / 2;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ? `Foto de ${name}` : 'Foto de perfil'}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
      ) : (
        <Text
          variant="captionStrong"
          color="primary"
          maxFontSizeMultiplier={1.1}
          style={{ fontSize: Math.max(12, size * 0.38), lineHeight: size * 0.5 }}
        >
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}
