import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { MinTouch, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCartCount } from '@/services/cartService';

export function CartIconButton() {
    const colors = useTheme();
    const router = useRouter();
    const [count, setCount] = useState(0);

    // Se refresca cada vez que la pantalla vuelve a estar en foco — así el
    // badge se actualiza solo al volver de agregar algo al carrito.
    useFocusEffect(
        useCallback(() => {
            getCartCount().then(setCount);
        }, [])
    );

    return (
        <Pressable
            onPress={() => router.push('/cart' as never)}
            accessibilityRole="button"
            accessibilityLabel={count > 0 ? `Carrito, ${count} ${count === 1 ? 'artículo' : 'artículos'}` : 'Carrito'}
            style={{
                width: MinTouch,
                height: MinTouch,
                borderRadius: Radius.full,
                backgroundColor: colors.backgroundElement,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Ionicons name="cart-outline" size={22} color={colors.text} />
            {count > 0 && (
                <View
                    style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                    }}
                >
                    <Text variant="captionStrong" maxFontSizeMultiplier={1} style={{ fontSize: 10, lineHeight: 14, color: colors.onPrimary }}>
                        {count > 9 ? '9+' : count}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}
