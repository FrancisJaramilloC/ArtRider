import { AccessibilityInfo, LayoutAnimation, Platform, UIManager } from 'react-native';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((value) => {
    reduceMotion = value;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
  reduceMotion = value;
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Transición suave y corta (180 ms) para el siguiente cambio de layout: cambio de chip, aparición
 * de listas, apertura de bloques. Respeta «reducir movimiento» y no se usa en web.
 */
export function animateLayout(): void {
  if (reduceMotion || Platform.OS === 'web') return;
  LayoutAnimation.configureNext({
    duration: 180,
    create: { type: 'easeInEaseOut', property: 'opacity' },
    update: { type: 'easeInEaseOut' },
    delete: { type: 'easeInEaseOut', property: 'opacity' },
  });
}
