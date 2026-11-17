import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Háptica ligera para acciones primarias (solo iOS/Android; nunca en web). */
export function hapticTap(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Háptica de selección para chips e interruptores (solo iOS/Android). */
export function hapticSelect(): void {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}
