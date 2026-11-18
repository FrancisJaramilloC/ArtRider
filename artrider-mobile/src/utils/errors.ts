/** Error de carga normalizado para la UI (mensaje corto en español + detalle técnico solo para desarrollo). */
export type ErrorKind = 'offline' | 'timeout' | 'permission' | 'unknown';

export type ErrorInfo = {
  kind: ErrorKind;
  /** Mensaje corto para el usuario. */
  message: string;
  /** Detalle técnico: solo se muestra en __DEV__. */
  detail?: string;
};

/** Se lanza cuando una carga supera el tiempo máximo (la pantalla nunca se queda cargando). */
export class LoadTimeoutError extends Error {
  constructor() {
    super('La carga está tardando');
    this.name = 'LoadTimeoutError';
  }
}

const NETWORK_PATTERN = /network request failed|failed to fetch|fetch failed|networkerror|network error|timeout|offline/i;

/** Permisos / RLS: reintentar no lo arregla. */
const PERMISSION_PATTERN = /row-level security|permission denied|not authorized|unauthorized|forbidden|42501|jwt expired/i;

export function toErrorInfo(error: unknown): ErrorInfo {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  if (error instanceof LoadTimeoutError) {
    return { kind: 'timeout', message: 'La carga está tardando. Inténtalo de nuevo.', detail: raw };
  }
  if (NETWORK_PATTERN.test(raw ?? '')) {
    return { kind: 'offline', message: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', detail: raw };
  }
  if (PERMISSION_PATTERN.test(raw ?? '')) {
    return { kind: 'permission', message: 'No tienes permiso para ver esta información. Cierra sesión, vuelve a entrar e inténtalo de nuevo.', detail: raw };
  }
  return { kind: 'unknown', message: 'No pudimos cargar esta información. Inténtalo de nuevo.', detail: raw };
}

/** Error de un servicio: conserva el contexto («[servicio] función») y el mensaje original. */
export function serviceError(context: string, cause: { message: string } | string): Error {
  const message = typeof cause === 'string' ? cause : cause.message;
  return new Error(`${context}: ${message}`);
}
