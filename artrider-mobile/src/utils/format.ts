/** «Hoy», «Hace 3 días», «Hace 2 meses»… para reseñas y listas. */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Hoy';
  if (days === 1) return 'Hace 1 día';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

/** Importe en centavos → «$120» o «$120.50». */
export function formatPrice(cents: number): string {
  const value = cents / 100;
  return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «2026-11-16» → «16 nov» (UTC, para no desplazar el día por zona horaria). */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
}
