import { useCallback, useState } from 'react';
import { Pressable, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { getCartCount } from '@/services/cartService';

export function CartIconButton() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
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
            onPress={() => router.push('/cart' as any)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundElement, alignItems: 'center', justifyContent: 'center' }}
        >
            <Ionicons name="cart-outline" size={18} color={colors.text} />
            {count > 0 && (
                <View
                    style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 3,
                    }}
                >
                    <ThemedText style={{ fontSize: 9.5, fontFamily: 'Inter_700Bold', color: '#fff' }}>
                        {count > 9 ? '9+' : count}
                    </ThemedText>
                </View>
            )}
        </Pressable>
    );
}