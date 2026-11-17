import { useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { FieldHeight, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { dateKey } from '@/utils/calendar';
import { Button } from './Button';
import { DEFAULT_PICKER_DATE, formatDateDisplay, parseDateKey, type BirthDateFieldProps } from './BirthDateField.types';
import { Sheet } from './Sheet';
import { Text } from './Text';

function toKey(date: Date): string {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Selector de fecha de nacimiento (iOS y Android).
 * - Cierra el teclado antes de abrir el selector.
 * - Android: diálogo nativo. iOS: hoja con ruedas y «Listo» (la fecha se guarda al confirmar).
 *   El selector de iOS se pinta con colores del tema: en línea quedaba como una barra gris vacía.
 */
export function BirthDateField({ value, onChange, onBlur, error, viewRef }: BirthDateFieldProps) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const selected = parseDateKey(value);
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(selected ?? DEFAULT_PICKER_DATE);

  function open() {
    Keyboard.dismiss();
    const start = selected ?? DEFAULT_PICKER_DATE;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toKey(date));
          onBlur();
        },
      });
      return;
    }
    setDraft(start);
    setIosOpen(true);
  }

  function confirm() {
    onChange(toKey(draft));
    setIosOpen(false);
    onBlur();
  }

  function cancel() {
    setIosOpen(false);
    onBlur();
  }

  return (
    <View ref={viewRef} style={{ gap: Spacing.two }}>
      <Text variant="bodyStrong">Fecha de nacimiento</Text>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Fecha de nacimiento"
        accessibilityValue={{ text: selected ? formatDateDisplay(selected) : 'Sin seleccionar' }}
        accessibilityHint={error ?? 'Abre el selector de fecha'}
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
        <Text variant="body" color={selected ? 'text' : 'textSecondary'} style={{ flex: 1 }}>
          {selected ? formatDateDisplay(selected) : 'Selecciona una fecha'}
        </Text>
      </Pressable>
      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive} style={{ marginTop: Spacing.half }} />
          <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }}>
            {error}
          </Text>
        </View>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Sheet
          visible={iosOpen}
          onClose={cancel}
          footer={<Button label="Listo" onPress={confirm} />}
        >
          <Text variant="subtitle" accessibilityRole="header" style={{ textAlign: 'center', marginBottom: Spacing.two }}>
            Fecha de nacimiento
          </Text>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            locale="es-ES"
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            textColor={colors.text}
            maximumDate={new Date()}
            onChange={(_event, date) => {
              if (date) setDraft(date);
            }}
            style={{ alignSelf: 'center', width: '100%' }}
          />
        </Sheet>
      ) : null}
    </View>
  );
}
