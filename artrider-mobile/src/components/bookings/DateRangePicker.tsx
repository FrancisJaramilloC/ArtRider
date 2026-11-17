import { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { COPY } from '@/constants/copy';
import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { addDaysKey, formatRangeLabel, formatShortDate, todayKey } from '@/utils/calendar';
import { CALENDAR_FIRST_DAY } from '@/utils/calendarLocale';

type CalendarTheme = NonNullable<ComponentProps<typeof Calendar>['theme']>;

/** Fechas «YYYY-MM-DD» locales. `to: null` = ya eligió la llegada y falta la salida. */
export type DateRange = { from: string | null; to: string | null };

const DAY_RADIUS = MinTouch / 2;

/** ¿Algún día del rango [from, to] está en el set de fechas bloqueadas? */
function rangeHasBlockedDay(fromStr: string, toStr: string, blocked: Set<string>): boolean {
  let cursor = fromStr;
  while (cursor <= toStr) {
    if (blocked.has(cursor)) return true;
    cursor = addDaysKey(cursor, 1);
  }
  return false;
}

/**
 * Selección de fechas en dos pasos: el primer toque marca solo la llegada; el segundo, la salida.
 * `onChange` emite el rango parcial (`to: null`) o completo; quien lo usa habilita «Agregar» solo con ambos.
 */
export function DateRangePicker({ blockedDates, onChange }: { blockedDates: string[]; onChange: (range: DateRange) => void }) {
  const scheme = useColorScheme();
  const colors = useTheme();
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [warning, setWarning] = useState<string | null>(null);

  function update(next: DateRange, warn: string | null = null) {
    setRange(next);
    setWarning(warn);
    onChange(next);
  }

  function handleDayPress(day: DateData) {
    const date = day.dateString;
    const pickingEnd = range.from !== null && range.to === null;

    // Primer toque, o ya había un rango completo: empieza de nuevo solo con la llegada.
    if (!pickingEnd) return update({ from: date, to: null });
    // Tocar otra vez la llegada no hace nada (para un solo día está «Solo este día»).
    if (date === range.from) return;
    // Un día anterior a la llegada reinicia ahí.
    if (date < range.from!) return update({ from: date, to: null });
    // Rango con días bloqueados: reinicia en el día tocado y avisa.
    if (rangeHasBlockedDay(range.from!, date, blockedSet)) return update({ from: date, to: null }, COPY.rangeHasBlockedDays);
    update({ from: range.from, to: date });
  }

  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    const container = { borderRadius: DAY_RADIUS, paddingTop: 0 };

    blockedDates.forEach((d) => {
      marks[d] = { disabled: true, disableTouchEvent: true, textColor: colors.textMuted };
    });

    if (range.from) {
      marks[range.from] = {
        startingDay: true,
        endingDay: range.to === null || range.from === range.to,
        color: colors.primary,
        textColor: colors.onPrimary,
        containerStyle: container,
      };
    }
    if (range.from && range.to && range.from !== range.to) {
      let cursor = addDaysKey(range.from, 1);
      while (cursor < range.to) {
        marks[cursor] = { color: colors.primarySoft, textColor: colors.text };
        cursor = addDaysKey(cursor, 1);
      }
      marks[range.to] = { endingDay: true, color: colors.primary, textColor: colors.onPrimary, containerStyle: container };
    }
    return marks;
  }, [range, blockedDates, colors]);

  // Celdas de 44×44 y barras del rango de la misma altura (por defecto 38×34 con barras de 34 y radio 17).
  const calendarTheme = useMemo(
    () =>
      ({
        calendarBackground: colors.background,
        dayTextColor: colors.text,
        monthTextColor: colors.text,
        textSectionTitleColor: colors.textSecondary,
        textDisabledColor: colors.textMuted,
        arrowColor: colors.primary,
        todayTextColor: colors.primary,
        textDayFontFamily: 'Inter_500Medium',
        textMonthFontFamily: 'Inter_700Bold',
        textDayHeaderFontFamily: 'Inter_500Medium',
        'stylesheet.day.period': {
          base: { width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center' },
          today: { backgroundColor: 'transparent', borderRadius: DAY_RADIUS },
          fillers: { position: 'absolute', height: MinTouch, flexDirection: 'row', left: 0, right: 0 },
          leftFiller: { height: MinTouch, flex: 1 },
          rightFiller: { height: MinTouch, flex: 1 },
        },
      }) as CalendarTheme,
    [colors],
  );

  const complete = range.from !== null && range.to !== null;
  const line = warning ?? (complete ? formatRangeLabel(range.from!, range.to!) : COPY.pickDatesGuide);

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <DateField label={COPY.arrivalLabel} value={range.from} active={range.from === null || complete} />
        <DateField label={COPY.departureLabel} value={range.to} active={range.from !== null && range.to === null} />
      </View>

      {/* Una sola línea de ayuda/aviso/resumen con altura fija: no hay saltos al cambiar de texto. */}
      <View style={{ minHeight: 40, justifyContent: 'center' }} accessibilityLiveRegion="polite">
        <Text variant={warning || complete ? 'bodyStrong' : 'body'} color={warning ? 'destructive' : complete ? 'text' : 'textSecondary'}>
          {line}
        </Text>
      </View>

      <Button
        label={COPY.onlyThisDay}
        variant="tonal"
        size="sm"
        fullWidth
        disabled={range.from === null || complete}
        onPress={() => range.from && update({ from: range.from, to: range.from })}
      />

      <Calendar
        key={scheme}
        firstDay={CALENDAR_FIRST_DAY}
        minDate={todayKey()}
        markingType="period"
        markedDates={markedDates}
        onDayPress={handleDayPress}
        theme={calendarTheme}
        style={{ borderRadius: Radius.card, overflow: 'hidden' }}
      />
    </View>
  );
}

function DateField({ label, value, active }: { label: string; value: string | null; active: boolean }) {
  const colors = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value ? formatShortDate(value) : COPY.dateNotChosen}`}
      style={{
        flex: 1,
        minHeight: MinTouch + Spacing.two,
        justifyContent: 'center',
        paddingHorizontal: Spacing.three,
        borderRadius: Radius.lg,
        borderWidth: active ? 2 : 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text variant="overline" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" color={value ? 'text' : 'textMuted'}>
        {value ? formatShortDate(value) : COPY.dateNotChosen}
      </Text>
    </View>
  );
}
