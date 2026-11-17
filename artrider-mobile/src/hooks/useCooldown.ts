import { useCallback, useEffect, useState } from 'react';

/** Cuenta atrás en segundos (p. ej. para limitar el reenvío de correos). `start()` la reinicia. */
export function useCooldown(initialSeconds = 0): { remaining: number; start: (seconds: number) => void } {
    const [remaining, setRemaining] = useState(initialSeconds);

    useEffect(() => {
        if (remaining <= 0) return;
        const timer = setTimeout(() => setRemaining((seconds) => seconds - 1), 1000);
        return () => clearTimeout(timer);
    }, [remaining]);

    const start = useCallback((seconds: number) => setRemaining(seconds), []);
    return { remaining, start };
}
