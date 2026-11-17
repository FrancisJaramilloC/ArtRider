import { useEffect, useState } from 'react';
import { toggleFavorito as toggleFavoritoService, type FavoritoTipo } from '@/services/favoritosService';
import { emitFavoriteChange, getKnownFavorite, onFavoriteChange } from '@/utils/favoritesSync';

/**
 * Versión mobile del useFavorito de la web. A diferencia de la web (que
 * puede hacer un fetch individual por card sin culpa), aquí el estado
 * inicial de "es favorito" se recibe como prop — se resuelve una sola vez
 * en la pantalla contenedora (getUserFavIds), no por cada card.
 * Además se sincroniza con cualquier otro corazón del mismo ítem (detalle, listas, Favoritos).
 */
export function useFavorito(itemId: string, tipo: FavoritoTipo, initialIsFavorito: boolean) {
    const [esFavorito, setEsFavorito] = useState(getKnownFavorite(itemId, tipo) ?? initialIsFavorito);
    const [loading, setLoading] = useState(false);

    useEffect(
        () =>
            onFavoriteChange((c) => {
                if (c.id === itemId && c.tipo === tipo) setEsFavorito(c.esFavorito);
            }),
        [itemId, tipo],
    );

    async function toggleFavorito() {
        if (loading) return;
        setLoading(true);
        // Optimista: actualiza la UI antes de esperar la respuesta
        setEsFavorito((prev) => !prev);

        const result = await toggleFavoritoService(itemId, tipo);
        setLoading(false);

        if (result.error) {
            // Revertir si falló
            setEsFavorito((prev) => !prev);
        } else {
            setEsFavorito(result.esFavorito);
            emitFavoriteChange({ id: itemId, tipo, esFavorito: result.esFavorito });
        }
    }

    return { esFavorito, toggleFavorito, loading };
}
