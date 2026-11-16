import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * SOLO vista web de desarrollo (revisión de diseño). Bloque con borde discontinuo que
 * conserva el estilo recibido para que el layout se vea como en nativo.
 */
export function Placeholder({ style, label }: { style?: StyleProp<ViewStyle>; label: string }): ReactNode {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9a8fae',
    backgroundColor: 'rgba(154, 143, 174, 0.12)',
    overflow: 'hidden',
  },
  text: { color: '#9a8fae', fontSize: 13, textAlign: 'center', padding: 8 },
});
