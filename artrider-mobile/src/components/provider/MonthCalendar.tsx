import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarMark } from '@/services/providerService';
import { WEEKDAY_LETTERS_ES, dateKey, monthGrid, monthTitle, todayKey } from '@/utils/calendar';

type Props = {
  marks: CalendarMark[];
  /** Se llama con la fecha ISO y su estado: libre, bloqueada o reservada. Los días pasados no responden. */
  onDayPress: (date: string, kind: 'free' | 'blocked' | 'booked') => void;
};

const RING = 2;
const DAY_VISUAL = 36;

/**
 * Calendario mensual en español (lunes primero). Celdas de ≥44pt, hoy con aro, reservas como bandas
 * continuas entre días, bloqueados con contorno discontinuo y número tachado.
 */
export function MonthCalendar({ marks, onDayPress }: Props) {
  const colors = useTheme();
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  const byDate = useMemo(() => new Map(marks.map((m) => [m.date, m.mark])), [marks]);
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.year, c.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  return (
    <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, paddingHorizontal: Spacing.two, paddingBottom: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevron-back" label="Mes anterior" variant="outline" onPress={() => shift(-1)} />
        <Text variant="subtitle" accessibilityRole="header" style={{ textTransform: 'capitalize' }}>
          {monthTitle(cursor.year, cursor.month)}
        </Text>
        <IconButton icon="chevron-forward" label="Mes siguiente" variant="outline" onPress={() => shift(1)} />
      </View>

      <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {WEEKDAY_LETTERS_ES.map((letter, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: Spacing.one }}>
            <Text variant="captionStrong" color="textSecondary">
              {letter}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={{ flex: 1, height: MinTouch }} />;
            const key = dateKey(cursor.year, cursor.month, day);
            const mark = byDate.get(key);
            const past = key < today;
            const isToday = key === today;
            const kind = mark === 'booked' ? 'booked' : mark === 'blocked' ? 'blocked' : 'free';
            // Banda continua: se une con el día anterior/siguiente reservado de la MISMA fila.
            const prevBooked = di > 0 && week[di - 1] !== null && byDate.get(dateKey(cursor.year, cursor.month, week[di - 1] as number)) === 'booked';
            const nextBooked = di < 6 && week[di + 1] !== null && byDate.get(dateKey(cursor.year, cursor.month, week[di + 1] as number)) === 'booked';
            const label = `${day} de ${monthTitle(cursor.year, cursor.month)}${isToday ? ', hoy' : ''}${kind === 'booked' ? ', reservado' : kind === 'blocked' ? ', bloqueado' : past ? '' : ', libre'}`;

            return (
              <Pressable
                key={di}
                disabled={past && kind === 'free'}
                onPress={() => onDayPress(key, kind)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: past && kind === 'free' }}
                style={{ flex: 1, height: MinTouch, alignItems: 'center', justifyContent: 'center' }}
              >
                {kind === 'booked' ? (
                  <View
                    style={{
                      position: 'absolute',
                      left: prevBooked ? 0 : Spacing.half,
                      right: nextBooked ? 0 : Spacing.half,
                      height: DAY_VISUAL,
                      backgroundColor: colors.primary,
                      borderTopLeftRadius: prevBooked ? 0 : Radius.full,
                      borderBottomLeftRadius: prevBooked ? 0 : Radius.full,
                      borderTopRightRadius: nextBooked ? 0 : Radius.full,
                      borderBottomRightRadius: nextBooked ? 0 : Radius.full,
                    }}
                  />
                ) : null}
                <View
                  style={{
                    width: DAY_VISUAL,
                    height: DAY_VISUAL,
                    borderRadius: Radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: RING,
                    borderColor: kind === 'blocked' ? colors.textMuted : isToday ? colors.primary : 'transparent',
                    borderStyle: kind === 'blocked' ? 'dashed' : 'solid',
                  }}
                >
                  <Text
                    variant={kind === 'booked' ? 'captionStrong' : 'caption'}
                    style={{
                      color: kind === 'booked' ? colors.onPrimary : past || kind === 'blocked' ? colors.textMuted : colors.text,
                      textDecorationLine: kind === 'blocked' ? 'line-through' : 'none',
                    }}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
