import { LocaleConfig } from 'react-native-calendars';

import { MONTHS_ES_LONG } from '@/utils/calendar';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Configuración de idioma única de react-native-calendars: español, lunes primero (se aplica al importar). */
LocaleConfig.locales.es = {
  monthNames: MONTHS_ES_LONG.map(cap),
  monthNamesShort: MONTHS_ES_LONG.map((m) => m.slice(0, 3)),
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

/** Primer día de la semana (1 = lunes) para el prop `firstDay` de <Calendar>. */
export const CALENDAR_FIRST_DAY = 1;
