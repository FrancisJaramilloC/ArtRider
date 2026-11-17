import { Redirect } from 'expo-router';
import type { ComponentType } from 'react';

// Galería SOLO de desarrollo. En producción (`__DEV__ === false`) redirige y el require se descarta.
const Gallery: ComponentType | null = __DEV__ ? require('@/dev/Gallery').default : null;

export default function DevGalleryRoute() {
  if (!Gallery) return <Redirect href="/" />;
  return <Gallery />;
}
