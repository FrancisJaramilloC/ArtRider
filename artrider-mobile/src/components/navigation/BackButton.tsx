import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { IconButton } from '@/components/ui/IconButton';

/**
 * Botón de volver con objetivo táctil de 44pt (círculo neutro). Sin historial (p. ej. al abrir la pantalla
 * por un enlace) `router.back()` lanza «GO_BACK was not handled»: en ese caso va a `fallbackHref` (Home por defecto).
 */
export function BackButton({ style, fallbackHref = '/' }: { style?: StyleProp<ViewStyle>; fallbackHref?: Href }) {
    const router = useRouter();
    return <IconButton icon="arrow-back" label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace(fallbackHref))} style={style} />;
}
