import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './Button';
import { Text } from './Text';

export type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `error` usa un tono de aviso en lugar del acento. */
  tone?: 'default' | 'error';
  style?: StyleProp<ViewStyle>;
};

/** Estado vacío o de error: ícono en círculo tenue, título, descripción y acción opcional. */
export function EmptyState({ icon = 'albums-outline', title, description, actionLabel, onAction, tone = 'default', style }: EmptyStateProps) {
  const colors = useTheme();
  const accent = tone === 'error' ? colors.destructive : colors.primary;

  return (
    <View
      accessible
      accessibilityRole="summary"
      style={[{ alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingVertical: Spacing.five, paddingHorizontal: Spacing.four }, style]}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: Radius.full,
          backgroundColor: tone === 'error' ? colors.backgroundElement : colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={32} color={accent} />
      </View>
      <View style={{ gap: Spacing.one, alignItems: 'center' }}>
        <Text variant="subtitle" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        {description ? (
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            {description}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="tonal" size="sm" /> : null}
    </View>
  );
}
