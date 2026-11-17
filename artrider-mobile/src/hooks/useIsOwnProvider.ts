import { useEffect, useState } from 'react';

import { getMyProviderProfile } from '@/services/providerService';

/** ¿El equipo/paquete es de MI proveedor? (para no dejar que un proveedor se reserve a sí mismo). */
export function useIsOwnProvider(providerId: string | undefined, enabled: boolean): boolean {
  const [own, setOwn] = useState(false);

  useEffect(() => {
    if (!enabled || !providerId) {
      setOwn(false);
      return;
    }
    let cancelled = false;
    getMyProviderProfile()
      .then((p) => {
        if (!cancelled) setOwn(p?.id === providerId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [providerId, enabled]);

  return own;
}
