import { useMemo, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';

export type DateRange = { from: string | null; to: string | null }; // YYYY-MM-DD

function todayStr(): string {
    return new Date().toISOString().split('T')[0];
}

function addDaysStr(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

function daysBetween(fromStr: string, toStr: string): number {
    const from = new Date(fromStr + 'T00:00:00');
    const to = new Date(toStr + 'T00:00:00');
    return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

/** ¿Algún día del rango [from, to] está en el set de fechas bloqueadas? */
function rangeHasBlockedDay(fromStr: string, toStr: string, blocked: Set<string>): boolean {
    let cursor = fromStr;
    while (cursor <= toStr) {
        if (blocked.has(cursor)) return true;
        cursor = addDaysStr(cursor, 1);
    }
    return false;
}

export function DateRangePicker({
    blockedDates,
    onChange,
}: {
    blockedDates: string[];
    onChange: (range: DateRange) => void;
}) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);

    const [range, setRange] = useState<DateRange>({ from: null, to: null });

    function handleDayPress(day: DateData) {
        const dateStr = day.dateString;

        // Sin selección todavía, o ya había un rango completo de 2+ días →
        // empieza una selección nueva de un solo día (from = to = esta fecha).
        // Un solo toque ya es una selección válida de 1 día — es el caso más común.
        if (!range.from || range.from !== range.to) {
            const next = { from: dateStr, to: dateStr };
            setRange(next);
            onChange(next);
            return;
        }

        // Ya había exactamente un día seleccionado — tocar la misma fecha no hace nada
        if (dateStr === range.from) return;

        // Fecha anterior a la seleccionada → reinicia ahí como nuevo día único
        if (dateStr < range.from) {
            const next = { from: dateStr, to: dateStr };
            setRange(next);
            onChange(next);
            return;
        }

        // Fecha posterior → intenta extender el rango hasta ella
        if (rangeHasBlockedDay(range.from, dateStr, blockedSet)) {
            const next = { from: dateStr, to: dateStr };
            setRange(next);
            onChange(next);
            return;
        }

        const next = { from: range.from, to: dateStr };
        setRange(next);
        onChange(next);
    }

    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};

        blockedDates.forEach((d) => {
            marks[d] = { disabled: true, disableTouchEvent: true, textColor: colors.textSecondary };
        });

        if (range.from) {
            marks[range.from] = {
                ...marks[range.from],
                startingDay: true,
                endingDay: range.from === range.to,
                color: colors.primary,
                textColor: '#fff',
            };
        }
        if (range.from && range.to && range.from !== range.to) {
            let cursor = addDaysStr(range.from, 1);
            while (cursor < range.to) {
                marks[cursor] = { ...marks[cursor], color: `${colors.primary}30`, textColor: colors.text };
                cursor = addDaysStr(cursor, 1);
            }
            marks[range.to] = { ...marks[range.to], endingDay: true, color: colors.primary, textColor: '#fff' };
        }

        return marks;
    }, [range, blockedDates, colors]);

    const days = range.from && range.to ? daysBetween(range.from, range.to) : 0;

    return (
        <View>
            <Calendar
                minDate={todayStr()}
                markingType="period"
                markedDates={markedDates}
                onDayPress={handleDayPress}
                theme={{
                    calendarBackground: colors.background,
                    dayTextColor: colors.text,
                    monthTextColor: colors.text,
                    textDisabledColor: colors.backgroundSelected,
                    arrowColor: colors.primary,
                    todayTextColor: colors.primary,
                    textDayFontFamily: 'Inter_500Medium',
                    textMonthFontFamily: 'Inter_700Bold',
                }}
                style={{ borderRadius: Radius.lg, overflow: 'hidden' }}
            />

            {days > 0 && (
                <View
                    style={{
                        marginTop: Spacing.three,
                        padding: Spacing.three,
                        backgroundColor: colors.backgroundElement,
                        borderRadius: Radius.lg,
                    }}
                >
                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text }}>
                        {range.from === range.to ? range.from : `${range.from} → ${range.to}`}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {days} {days === 1 ? 'día' : 'días'} seleccionados
                    </ThemedText>
                </View>
            )}
        </View>
    );
}