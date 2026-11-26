import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Lo mínimo que necesita el guardián de cualquier resultado de cobro (equipo, paquete o carrito). */
type PaymentAttempt = { uncertain?: boolean };

/**
 * Protege el pago de una pantalla de checkout:
 * - `inFlight`: hay un cobro en curso → el formulario se desactiva (doble toque = un solo cobro).
 * - `locked`: el último cobro fue incierto → no se puede volver a pagar en esta pantalla; solo "Ver mis reservas".
 *   Se desbloquea al salir de la pantalla (blur o desmontaje).
 * `run` ignora (devuelve null) cualquier llamada mientras otra está en curso: el ref se marca de forma síncrona, así que dos
 * eventos seguidos (doble toque o doble mensaje del WebView) no pueden lanzar dos cobros aunque el estado aún no se haya pintado.
 * Si `fn` lanza, se trata como incierto: se bloquea la pantalla y se devuelve null.
 */
export function usePaymentGuard() {
    const inFlightRef = useRef(false);
    const [inFlight, setInFlight] = useState(false);
    const [locked, setLocked] = useState(false);

    useFocusEffect(
        useCallback(() => {
            return () => setLocked(false);
        }, []),
    );

    const run = useCallback(async <T extends PaymentAttempt>(fn: () => Promise<T>): Promise<T | null> => {
        if (inFlightRef.current) return null;
        inFlightRef.current = true;
        setInFlight(true);
        try {
            const result = await fn();
            if (result.uncertain) setLocked(true);
            return result;
        } catch (error) {
            console.warn('[usePaymentGuard] el cobro lanzó una excepción:', error instanceof Error ? error.message : error);
            setLocked(true);
            return null;
        } finally {
            inFlightRef.current = false;
            setInFlight(false);
        }
    }, []);

    return { inFlight, locked, run };
}
