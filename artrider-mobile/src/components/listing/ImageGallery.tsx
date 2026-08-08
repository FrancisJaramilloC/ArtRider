import { useState } from 'react';
import { View, ScrollView, Image, Dimensions, useColorScheme, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = 280;

export function ImageGallery({ images }: { images: string[] }) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const [activeIndex, setActiveIndex] = useState(0);

    function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(index);
    }

    if (images.length === 0) {
        return (
            <LinearGradient
                colors={['#efeaf9', '#e3dbf4']}
                style={{ width: SCREEN_WIDTH, height: GALLERY_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
            >
                <Ionicons name="grid-outline" size={40} color="#875B9A80" />
            </LinearGradient>
        );
    }

    return (
        <View>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {images.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={{ width: SCREEN_WIDTH, height: GALLERY_HEIGHT }} resizeMode="cover" />
                ))}
            </ScrollView>

            {images.length > 1 && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 12,
                        alignSelf: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                    }}
                >
                    {images.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}