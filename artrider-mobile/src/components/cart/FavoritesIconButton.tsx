import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { BadgeIconButton } from '@/components/ui/BadgeIconButton';
import { getUserFavIds } from '@/services/favoritosService';
import { onFavoriteChange } from '@/utils/favoritesSync';

/** Corazón de cabecera con el nº de favoritos; se mantiene al día sin recargar la pantalla. */
export function FavoritesIconButton() {
    const router = useRouter();
    const [count, setCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            getUserFavIds().then((ids) => setCount(ids.equipoIds.length + ids.paqueteIds.length));
        }, [])
    );

    // Un corazón tocado en cualquier pantalla suma o resta al instante.
    useEffect(() => onFavoriteChange((c) => setCount((n) => Math.max(0, n + (c.esFavorito ? 1 : -1)))), []);

    return <BadgeIconButton icon="heart-outline" label="Favoritos" countNoun={['favorito', 'favoritos']} count={count} onPress={() => router.push('/favorites' as never)} />;
}
