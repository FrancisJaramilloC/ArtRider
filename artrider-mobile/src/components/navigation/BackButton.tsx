import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { IconButton } from '@/components/ui/IconButton';

/** Botón de volver con objetivo táctil de 44pt (círculo neutro). */
export function BackButton({ style }: { style?: StyleProp<ViewStyle> }) {
    const router = useRouter();
    return <IconButton icon="arrow-back" label="Volver" onPress={() => router.back()} style={style} />;
}
