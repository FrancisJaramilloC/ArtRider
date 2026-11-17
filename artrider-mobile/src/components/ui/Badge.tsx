import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, StatusColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

/** Etiqueta compacta de estado o énfasis. Los tonos de estado reutilizan `StatusColors`. */
export function Badge({ label, tone = 'neutral', icon, style }: BadgeProps) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const status = StatusColors[scheme === 'dark' ? 'dark' : 'light'];

  const palette = {
    neutral: { bg: colors.backgroundSelected, fg: colors.textSecondary },
    accent: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: status.confirmed.bg, fg: status.confirmed.fg },
    warning: { bg: status.pending.bg, fg: status.pending.fg },
    danger: { bg: status.cancelled.bg, fg: status.cancelled.fg },
  }[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: Spacing.one,
          paddingHorizontal: Spacing.snug,
          paddingVertical: Spacing.one,
          borderRadius: Radius.full,
          backgroundColor: palette.bg,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={palette.fg} /> : null}
      <Text
        variant="captionStrong"
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={{ color: palette.fg, fontSize: 12, lineHeight: 16 }}
      >
        {label}
      </Text>
    </View>
  );
}
