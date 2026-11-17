import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouch, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Encabezado de sección: título en negrita, subtítulo opcional y acción «Ver más». */
export function SectionHeader({ title, subtitle, actionLabel, onActionPress, style }: SectionHeaderProps) {
  const colors = useTheme();
  return (
    <View testID="section-header" style={[{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, style]}>
      <View style={{ flex: 1, gap: Spacing.half }}>
        <Text testID="section-title" variant="headline" numberOfLines={2} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          testID="section-action"
          onPress={onActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={{ minHeight: MinTouch, minWidth: MinTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}
        >
          <Text variant="captionStrong" color="primary">
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
