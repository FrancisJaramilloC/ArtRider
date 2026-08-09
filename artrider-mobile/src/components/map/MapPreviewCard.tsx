import { View, Pressable, Image, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_LABELS, CATEGORY_GRADIENTS } from '@/constants/categories';
import type { Listing } from '@/services/catalogService';

export function MapPreviewCard({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const catLabel = CATEGORY_LABELS[listing.category ?? ''] ?? listing.category ?? 'Equipo';
  const gradient = CATEGORY_GRADIENTS[listing.category ?? ''] ?? CATEGORY_GRADIENTS.other;
  const price = `$${(listing.daily_price / 100).toFixed(0)}`;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: Spacing.four,
        left: Spacing.four,
        right: Spacing.four,
        backgroundColor: colors.background,
        borderRadius: Radius.lg,
        overflow: 'hidden',
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <Pressable
        onPress={() => router.push(`/listing/${listing.id}` as any)}
        style={{ flexDirection: 'row', flex: 1 }}
      >
        <View style={{ width: 90, height: 90 }}>
          {listing.cover_image_url ? (
            <Image source={{ uri: listing.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <LinearGradient colors={gradient} style={{ width: '100%', height: '100%' }} />
          )}
        </View>
        <View style={{ flex: 1, padding: Spacing.three, justifyContent: 'center' }}>
          <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 3 }}>
            {catLabel}
          </ThemedText>
          <ThemedText numberOfLines={2} style={{ fontFamily: 'Inter_700Bold', fontSize: 13.5, color: colors.text }}>
            {listing.title ?? 'Equipo'}
          </ThemedText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary }}>
              <ThemedText style={{ fontFamily: 'Inter_700Bold', color: colors.text }}>{price}</ThemedText> /día
            </ThemedText>
            {listing.address?.city && (
              <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>{listing.address.city}</ThemedText>
            )}
          </View>
        </View>
      </Pressable>
      <Pressable onPress={onClose} hitSlop={8} style={{ padding: Spacing.two, justifyContent: 'flex-start' }}>
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}