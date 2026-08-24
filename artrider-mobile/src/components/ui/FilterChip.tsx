import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Gradients, Spacing } from '@/constants/theme';

/**
 * Píldora de filtro/categoría reutilizable — gradiente de marca cuando está
 * activa, borde sutil cuando no. Reemplaza los rellenos planos de
 * colors.primary que cada pantalla (Home, Reservas, Mensajes, Anuncios)
 * reimplementaba por su cuenta con estilos ligeramente distintos.
 */
export function FilterChip({
  label,
  active,
  onPress,
  icon,
  colors,
  style,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  colors: any;
  style?: StyleProp<ViewStyle>;
}) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.three, paddingVertical: 10 }}>
      {icon && <Ionicons name={icon} size={15} color={active ? '#fff' : colors.textSecondary} />}
      <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: active ? '#fff' : colors.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );

  if (active) {
    return (
      <Pressable onPress={onPress} style={[{ borderRadius: 999, overflow: 'hidden' }, style]}>
        <LinearGradient colors={Gradients.chipActive} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[{ borderRadius: 999, borderWidth: 1, borderColor: colors.border }, style]}
    >
      {content}
    </Pressable>
  );
}
