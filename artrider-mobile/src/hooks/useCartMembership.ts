import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getCartItems } from '@/services/cartService';

/**
 * ¿Este equipo/paquete ya está en el carrito? Se vuelve a consultar al recuperar el foco (al volver
 * del carrito donde pudo quitarse). Si falla la lectura se asume «no», sin molestar al usuario.
 */
export function useCartMembership(kind: 'listing' | 'package', id: string | undefined, enabled: boolean) {
  const [inCart, setInCart] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !id) {
        setInCart(false);
        return;
      }
      let cancelled = false;
      getCartItems()
        .then((items) => {
          if (!cancelled) setInCart(items.some((i) => (kind === 'listing' ? i.listing_id === id : i.package_id === id)));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [kind, id, enabled]),
  );

  return { inCart, markInCart: () => setInCart(true) };
}
