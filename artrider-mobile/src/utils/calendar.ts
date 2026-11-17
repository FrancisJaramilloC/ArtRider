/** Utilidades de calendario en español (lunes primero). Sin dependencias de zona horaria: todo en UTC. */

export const MONTHS_ES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const WEEKDAYS_ES_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
/** Cabecera de la cuadrícula: lunes primero. */
export const WEEKDAY_LETTERS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** «2026-11-16» de la fecha local de hoy. */
export function todayKey(now: Date = new Date()): string {
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

/** (2026, 10 = noviembre, 6) → «2026-11-06». `month` es 0-11. */
export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** «noviembre 2026». */
export function monthTitle(year: number, month: number): string {
  return `${MONTHS_ES_LONG[month]} ${year}`;
}

/** Semanas del mes (lunes primero); los huecos fuera del mes son null. */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // 0 = lunes
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** «lun 16 nov» para el título de la hoja de un día. */
export function formatDayLong(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00Z');
  return `${WEEKDAYS_ES_SHORT[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS_ES_LONG[d.getUTCMonth()]}`;
}

/** Suma días a una fecha «YYYY-MM-DD» sin pasar por la zona horaria (aritmética en UTC). */
export function addDaysKey(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return dateKey(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
}

/** Días de un rango contando llegada y salida (salida − llegada + 1): el mismo criterio que web y servidor. */
export function daysInclusive(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = toStr.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000) + 1;
}

/** «17 nov». */
export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS_ES_LONG[m - 1].slice(0, 3)}`;
}

/** «17 nov – 19 nov · 3 días» (o «17 nov · 1 día»). */
export function formatRangeLabel(fromStr: string, toStr: string): string {
  const days = daysInclusive(fromStr, toStr);
  const dates = fromStr === toStr ? formatShortDate(fromStr) : `${formatShortDate(fromStr)} – ${formatShortDate(toStr)}`;
  return `${dates} · ${days} ${days === 1 ? 'día' : 'días'}`;
}
