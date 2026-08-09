import { Pressable, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius } from '@/constants/theme';

export function BackButton({ style }: { style?: StyleProp<ViewStyle> }) {
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    return (
        <Pressable
            onPress={() => router.back()}
            style={[
                {
                    width: 36,
                    height: 36,
                    borderRadius: Radius.full,
                    backgroundColor: colors.backgroundElement,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                style,
            ]}
        >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
    );
}
