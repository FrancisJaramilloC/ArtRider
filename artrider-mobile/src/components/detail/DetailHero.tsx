import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useWindowDimensions } from 'react-native';

import { ImageGallery } from '@/components/listing/ImageGallery';
import { IconButton } from '@/components/ui/IconButton';
import { Aspect, FavoriteAccent, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export type DetailHeroProps = {
  /** Fotos del equipo (galería) o la portada del paquete. */
  images: string[];
  esFavorito: boolean;
  onToggleFavorito: () => void;
};

/**
 * Cabecera de detalle: foto a todo el ancho con botón de volver y corazón superpuestos
 * (respetan la safe area) y una hoja redondeada que sube sobre la foto.
 */
export function DetailHero({ images, esFavorito, onToggleFavorito }: DetailHeroProps) {
  const router = useRouter();
  const colors = useTheme();
  const { gutter, insets } = useLayout();
  const top = insets.top + Spacing.one;

  return (
    <View>
      <ImageGallery images={images} />
      <IconButton
        icon="arrow-back"
        label="Volver"
        variant="overlay"
        onPress={() => router.back()}
        style={{ position: 'absolute', top, left: gutter - 2 }}
      />
      <IconButton
        icon={esFavorito ? 'heart' : 'heart-outline'}
        label={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        variant="overlay"
        color={esFavorito ? FavoriteAccent : colors.onImage}
        onPress={onToggleFavorito}
        style={{ position: 'absolute', top, right: gutter - 2 }}
      />
    </View>
  );
}

/** Portada de paquete: misma proporción que la galería, con la foto o un bloque neutro. */
export function PackageCover({ uri }: { uri: string | null }) {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const height = Math.min(Math.round(width / Aspect.hero), 440);
  if (!uri) return <View style={{ width, height, backgroundColor: colors.primarySoft }} />;
  return <Image source={{ uri }} style={{ width, height }} contentFit="cover" transition={150} cachePolicy="memory-disk" />;
}
