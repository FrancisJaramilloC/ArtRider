import { useCallback, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { findNodeHandle, type ScrollViewInstance, type TextInputInstance, type View } from 'react-native';

import { runRules, type Rule } from '@/utils/validation';

type Values<K extends string> = Record<K, string>;
type Errors<K extends string> = Partial<Record<K, string>>;

export type FieldBinding = {
  value: string;
  onChangeText: (next: string) => void;
  onBlur: () => void;
  error: string | null;
  inputRef: RefObject<TextInputInstance | null>;
};

const SCROLL_MARGIN = 24;

/** Vista nativa de un campo que no es TextInput (p. ej. el selector de fecha). */
export type FieldViewInstance = ComponentRef<typeof View>;

/**
 * Estado y validación de un formulario por campo.
 * - Valida al salir del campo (blur) y al enviar; al corregir, el error se limpia/actualiza al instante.
 * - Al enviar con errores, desplaza hasta el primer campo inválido (en el orden de `rules`) y le da foco.
 * - `submit` evita el doble envío y expone `submitting` y `submitError` (banner con «Reintentar»).
 */
export function useForm<K extends string>(initial: Values<K>, rules: { [P in K]?: Rule<Values<K>>[] }) {
  const [values, setValues] = useState<Values<K>>(initial);
  const [errors, setErrors] = useState<Errors<K>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const refs = useRef<Partial<Record<K, RefObject<TextInputInstance | null>>>>({});
  const viewRefs = useRef<Partial<Record<K, RefObject<FieldViewInstance | null>>>>({});
  const submittingRef = useRef(false);
  const lastSubmit = useRef<(() => Promise<void>) | null>(null);

  const order = Object.keys(rules) as K[];

  function refFor(name: K): RefObject<TextInputInstance | null> {
    let ref = refs.current[name];
    if (!ref) {
      ref = { current: null };
      refs.current[name] = ref;
    }
    return ref;
  }

  /** Referencia para campos que no son TextInput: solo se usa para desplazarse hasta ellos. */
  function viewRefFor(name: K): RefObject<FieldViewInstance | null> {
    let ref = viewRefs.current[name];
    if (!ref) {
      ref = { current: null };
      viewRefs.current[name] = ref;
    }
    return ref;
  }

  const validateField = useCallback(
    (name: K, next: Values<K>): string | null => runRules(rules[name] ?? [], next[name], next),
    // Las reglas son estables por pantalla (se declaran fuera del render o no cambian).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const setValue = useCallback(
    (name: K, value: string) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        // Si el campo ya mostraba un error, se revalida al corregir (el error desaparece en cuanto es válido).
        setErrors((e) => {
          if (!e[name]) return e;
          const message = validateField(name, next);
          const copy = { ...e };
          if (message) copy[name] = message;
          else delete copy[name];
          return copy;
        });
        return next;
      });
      setSubmitError(null);
    },
    [validateField],
  );

  const blur = useCallback(
    (name: K) => {
      setValues((current) => {
        const message = validateField(name, current);
        setErrors((e) => {
          const copy = { ...e };
          if (message) copy[name] = message;
          else delete copy[name];
          return copy;
        });
        return current;
      });
    },
    [validateField],
  );

  function field(name: K): FieldBinding {
    return {
      value: values[name],
      onChangeText: (next) => setValue(name, next),
      onBlur: () => blur(name),
      error: errors[name] ?? null,
      inputRef: refFor(name),
    };
  }

  function focusAndScroll(name: K) {
    const input = refFor(name).current;
    const scroll = scrollRef.current;
    const view = viewRefs.current[name]?.current;
    if (!input && view && scroll) {
      const scrollNode = findNodeHandle(scroll);
      if (scrollNode) view.measureLayout(scrollNode, (_x: number, y: number) => scroll.scrollTo({ y: Math.max(0, y - SCROLL_MARGIN), animated: true }), () => undefined);
      return;
    }
    if (!input) return;
    const node = scroll ? findNodeHandle(scroll) : null;
    if (scroll && node) {
      input.measureLayout(
        node,
        (_x: number, y: number) => {
          scroll.scrollTo({ y: Math.max(0, y - SCROLL_MARGIN), animated: true });
          input.focus();
        },
        () => input.focus(),
      );
    } else {
      input.focus();
    }
  }

  /**
   * Valida todo (o solo `names`, p. ej. los campos del paso actual de un asistente). Devuelve true si no hay
   * errores; si los hay, los muestra y enfoca el primero.
   */
  function validateAll(names?: K[]): boolean {
    const scope = names ?? order;
    const next: Errors<K> = {};
    for (const name of scope) {
      const message = validateField(name, values);
      if (message) next[name] = message;
    }
    setErrors((prev) => {
      const kept: Errors<K> = names ? { ...prev } : {};
      for (const name of scope) delete kept[name];
      return { ...kept, ...next };
    });
    const first = scope.find((name) => next[name]);
    if (first) focusAndScroll(first);
    return first === undefined;
  }

  /** Envía: valida, evita el doble toque y captura el error del servidor como banner. */
  async function submit(action: (values: Values<K>) => Promise<string | null | void>) {
    if (submittingRef.current) return;
    const run = async () => {
      if (submittingRef.current) return;
      if (!validateAll()) return;
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const message = await action(values);
        if (message) setSubmitError(message);
      } catch (e) {
        setSubmitError(e instanceof Error && e.message ? e.message : 'No se pudo completar la acción. Inténtalo de nuevo.');
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    };
    lastSubmit.current = run;
    await run();
  }

  /** Reemplaza todos los valores (p. ej. al cargar un registro para editarlo) y limpia los errores. */
  const reset = useCallback((next: Values<K>) => {
    setValues(next);
    setErrors({});
    setSubmitError(null);
  }, []);

  const retry = useCallback(() => {
    lastSubmit.current?.();
  }, []);

  return { values, errors, field, viewRefFor, setValue, reset, validateAll, submit, retry, submitting, submitError, setSubmitError, scrollRef };
}
