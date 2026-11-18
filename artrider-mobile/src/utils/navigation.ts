import type { useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/**
 * Cierra el flujo de pago (carrito / checkout / éxito) y deja al Rider en la pestaña Reservas.
 * `replace` solo sustituye la pantalla de éxito: el carrito y el checkout seguirían en la pila y "atrás"/Home volverían a ellos.
 * Primero se vacía la pila hasta la raíz y después se abre la pestaña.
 */
export function goToReservationsAfterPayment(router: AppRouter): void {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(tabs)/reservations' as never);
}
