import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { BadgeIconButton } from '@/components/ui/BadgeIconButton';
import { getCartCount } from '@/services/cartService';

export function CartIconButton() {
    const router = useRouter();
    const [count, setCount] = useState(0);

    // Se refresca cada vez que la pantalla vuelve a estar en foco — así el
    // badge se actualiza solo al volver de agregar algo al carrito.
    useFocusEffect(
        useCallback(() => {
            getCartCount().then(setCount);
        }, [])
    );

    return <BadgeIconButton icon="cart-outline" label="Carrito" countNoun={['artículo', 'artículos']} count={count} onPress={() => router.push('/cart' as never)} />;
}
