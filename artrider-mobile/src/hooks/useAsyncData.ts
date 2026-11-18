import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { useFocusEffect } from 'expo-router';

import { LoadTimeoutError, toErrorInfo, type ErrorInfo } from '@/utils/errors';

export type AsyncStatus = 'loading' | 'success' | 'empty' | 'error';

export type UseAsyncDataOptions<T> = {
  /** Define cuándo el dato es un vacío REAL (distinto de un error). */
  isEmpty?: (data: T) => boolean;
  /** Tiempo máximo de una carga; al vencer pasa a error («La carga está tardando»). Por defecto 15 s. */
  timeoutMs?: number;
  /** Vuelve a cargar (sin vaciar la pantalla) cada vez que la pantalla recupera el foco. */
  reloadOnFocus?: boolean;
  /** Si es false no carga (p. ej. mientras falta un parámetro). */
  enabled?: boolean;
  /** Dependencias que reinician la carga inicial (id, filtros…). */
  deps?: DependencyList;
};

export type UseAsyncData<T> = {
  status: AsyncStatus;
  data: T | null;
  /** Error de la carga inicial (sin datos previos). */
  error: ErrorInfo | null;
  /** Fallo de un refresco con datos ya en pantalla: se conservan los datos y se muestra un aviso. */
  refreshError: ErrorInfo | null;
  loading: boolean;
  refreshing: boolean;
  /** «Reintentar»: recarga (carga inicial si no hay datos; refresco silencioso si ya hay). */
  reload: () => Promise<void>;
  /** Pull-to-refresh: siempre reintenta. */
  refresh: () => Promise<void>;
  /** Actualización local optimista (p. ej. quitar un elemento) sin pasar por la red. */
  setData: (updater: (prev: T | null) => T | null) => void;
};

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Estados de carga reales: loading / success / empty / error.
 * - Cancela al desmontar y descarta respuestas de cargas antiguas.
 * - `finally` siempre baja el loading y hay un timeout (15 s): nunca se queda cargando infinito.
 * - Si ya hay datos y un refresco falla, conserva los datos y expone `refreshError`.
 * - Una carga que TERMINA con `null` (p. ej. «este usuario aún no es Partner») es éxito, no «cargando»: se distingue
 *   con `settled` (antes `data === null` se confundía con «todavía no llegó» y el skeleton no terminaba nunca).
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, options: UseAsyncDataOptions<T> = {}): UseAsyncData<T> {
  const { isEmpty, timeoutMs = DEFAULT_TIMEOUT_MS, reloadOnFocus = false, enabled = true, deps = [] } = options;

  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [refreshError, setRefreshError] = useState<ErrorInfo | null>(null);
  const [loading, setLoading] = useState(enabled);
  /** true cuando la última carga inicial terminó bien (aunque el resultado sea null). */
  const [settled, setSettled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const dataRef = useRef<T | null>(null);
  const seq = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      seq.current += 1; // invalida cualquier carga en vuelo
    };
  }, []);

  const run = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const id = ++seq.current;
      if (mode === 'initial') {
        setLoading(true);
        setSettled(false);
        setError(null);
      } else {
        setRefreshing(true);
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new LoadTimeoutError()), timeoutMs);
        });
        const result = await Promise.race([fetcherRef.current(), timeout]);
        if (!mounted.current || id !== seq.current) return;
        dataRef.current = result;
        setDataState(result);
        setSettled(true);
        setError(null);
        setRefreshError(null);
      } catch (e) {
        if (!mounted.current || id !== seq.current) return;
        const info = toErrorInfo(e);
        if (__DEV__) console.warn('[useAsyncData]', info.detail ?? info.message);
        // Con datos en pantalla: se conservan y solo se avisa; sin datos: pantalla de error.
        if (dataRef.current !== null) setRefreshError(info);
        else setError(info);
      } finally {
        if (timer) clearTimeout(timer);
        if (mounted.current && id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [timeoutMs],
  );

  // Carga inicial y al cambiar las dependencias.
  useEffect(() => {
    if (!enabled) return;
    dataRef.current = null;
    setDataState(null);
    run('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  // Refresco silencioso al volver a la pantalla (la primera vez la cubre la carga inicial).
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (!reloadOnFocus) return;
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (enabled) run(dataRef.current !== null ? 'refresh' : 'initial');
    }, [reloadOnFocus, enabled, run]),
  );

  const reload = useCallback(() => run(dataRef.current !== null ? 'refresh' : 'initial'), [run]);
  const refresh = useCallback(() => run(dataRef.current !== null ? 'refresh' : 'initial'), [run]);

  const setData = useCallback((updater: (prev: T | null) => T | null) => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setDataState(next);
  }, []);

  let status: AsyncStatus;
  if (loading && !settled) status = 'loading';
  else if (error && !settled) status = 'error';
  else if (settled) status = isEmpty?.(data as T) ? 'empty' : 'success';
  else status = 'loading';

  return { status, data, error, refreshError, loading, refreshing, reload, refresh, setData };
}
