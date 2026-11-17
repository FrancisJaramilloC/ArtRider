import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FieldHeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { todayKey } from '@/utils/calendar';
import type { BirthDateFieldProps } from './BirthDateField.types';
import { Text } from './Text';

/** Solo vista web de revisión de diseño: el selector nativo del navegador (`<input type="date">`). */
export function BirthDateField({ value, onChange, onBlur, error, viewRef }: BirthDateFieldProps) {
  const colors = useTheme();

  return (
    <View ref={viewRef} style={{ gap: Spacing.two }}>
      <Text variant="bodyStrong">Fecha de nacimiento</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.two,
          minHeight: FieldHeight,
          backgroundColor: colors.backgroundElement,
          borderRadius: Radius.xl,
          borderWidth: 1.5,
          borderColor: error ? colors.destructive : 'transparent',
          paddingHorizontal: Spacing.three,
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={error ? colors.destructive : colors.textSecondary} />
        <input
          type="date"
          aria-label="Fecha de nacimiento"
          aria-invalid={!!error}
          value={value}
          max={todayKey()}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          style={{
            flex: 1,
            minHeight: FieldHeight,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: colors.text,
            fontSize: 15,
            fontFamily: 'Inter_400Regular',
            colorScheme: 'normal',
          }}
        />
      </View>
      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive} style={{ marginTop: Spacing.half }} />
          <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
