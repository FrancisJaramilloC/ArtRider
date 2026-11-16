import { useState } from 'react';
import { View, ScrollView, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Aspect, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Alto máximo en pantallas grandes para que la foto no domine el layout. */
const MAX_GALLERY_HEIGHT = 440;

export function ImageGallery({ images }: { images: string[] }) {
    const colors = useTheme();
    const { width } = useWindowDimensions();
    const height = Math.min(Math.round(width / Aspect.hero), MAX_GALLERY_HEIGHT);
    const [activeIndex, setActiveIndex] = useState(0);

    function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
        setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    }

    if (images.length === 0) {
        return (
            <View style={{ width, height, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="image-outline" size={40} color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ width, height, backgroundColor: colors.backgroundSelected }}>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {images.map((uri, i) => (
                    <Image
                        key={uri + i}
                        source={{ uri }}
                        style={{ width, height }}
                        contentFit="cover"
                        transition={150}
                        cachePolicy="memory-disk"
                        accessibilityLabel={`Foto ${i + 1} de ${images.length}`}
                    />
                ))}
            </ScrollView>

            {images.length > 1 && (
                <View
                    accessibilityLabel={`Foto ${activeIndex + 1} de ${images.length}`}
                    style={{
                        position: 'absolute',
                        bottom: Spacing.four + Radius.sheet / 2,
                        alignSelf: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        backgroundColor: colors.onImageSurface,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: Radius.full,
                    }}
                >
                    {images.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: colors.onImage,
                                opacity: i === activeIndex ? 1 : 0.5,
                            }}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}
