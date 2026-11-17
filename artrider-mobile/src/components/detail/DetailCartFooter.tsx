import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { AddToCartSheet } from '@/components/detail/AddToCartSheet';
import { DetailBottomBar } from '@/components/detail/DetailParts';
import { useAuth } from '@/hooks/useAuth';
import { useCartMembership } from '@/hooks/useCartMembership';
import { useIsOwnProvider } from '@/hooks/useIsOwnProvider';
import { formatPrice } from '@/utils/format';

/** Cuánto se muestra «Agregado al carrito» tras agregar. */
const ADDED_NOTICE_MS = 2500;

export type DetailCartFooterProps = {
  kind: 'listing' | 'package';
  id: string;
  title: string;
  /** Precio por día en centavos. */
  dailyPrice: number;
  providerId: string;
};

/**
 * Barra de reserva + hoja «Agregar al carrito» compartidas por el detalle de equipo y de paquete.
 * Sin sesión lleva al login; si el ítem es de tu propio proveedor se explica en vez de ofrecer acciones.
 */
export function DetailCartFooter({ kind, id, title, dailyPrice, providerId }: DetailCartFooterProps) {
  const router = useRouter();
  const { session } = useAuth();
  const loggedIn = !!session?.user;
  const { inCart, markInCart } = useCartMembership(kind, id, loggedIn);
  const isOwn = useIsOwnProvider(providerId, loggedIn);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), ADDED_NOTICE_MS);
    return () => clearTimeout(t);
  }, [justAdded]);

  function handleCartPress() {
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    if (inCart) {
      router.push('/cart' as never);
      return;
    }
    setSheetOpen(true);
  }

  const reservePath = kind === 'listing' ? `/checkout/${id}` : `/checkout/package/${id}`;

  return (
    <>
      <DetailBottomBar
        priceLabel={formatPrice(dailyPrice)}
        cartState={inCart ? 'in-cart' : 'idle'}
        justAdded={justAdded}
        onCartPress={handleCartPress}
        onReserve={() => router.push(reservePath as never)}
        disabledReason={isOwn ? `Este ${kind === 'listing' ? 'equipo' : 'paquete'} es tuyo: no puedes reservarlo ni agregarlo al carrito.` : undefined}
      />
      <AddToCartSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        kind={kind}
        id={id}
        title={title}
        dailyPrice={dailyPrice}
        onAdded={() => {
          markInCart();
          setJustAdded(true);
        }}
      />
    </>
  );
}
