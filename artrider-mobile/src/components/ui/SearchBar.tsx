import { Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, MinTouch, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Se muestra la «x» cuando hay texto o `showClear` es true. */
  onClear?: () => void;
  showClear?: boolean;
  returnKeyType?: 'search' | 'done';
  style?: StyleProp<ViewStyle>;
};

/** Buscador en píldora (estilo Airbnb): fondo limpio, borde fino y sombra muy suave. */
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onFocus,
  onBlur,
  onClear,
  showClear,
  returnKeyType = 'search',
  style,
}: SearchBarProps) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const canClear = onClear && (showClear ?? value.length > 0);

  return (
    <View
      style={[
        {
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.two,
          paddingLeft: Spacing.three,
          paddingRight: Spacing.two,
          borderRadius: Radius.full,
          backgroundColor: scheme === 'dark' ? colors.backgroundElement : colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
        scheme === 'dark' ? null : Shadows.card,
        style,
      ]}
    >
      <Ionicons name="search" size={20} color={colors.text} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType={returnKeyType}
        accessibilityLabel={placeholder}
        maxFontSizeMultiplier={1.3}
        style={{ flex: 1, paddingVertical: Spacing.three, fontSize: 15, fontFamily: Fonts.sans, color: colors.text }}
      />
      {canClear ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          style={{ width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
