import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type ScreenHeaderProps = {
  title: string;
  /** Muestra el botón de volver (por defecto true). */
  back?: boolean;
  /** Acción opcional a la derecha (por ejemplo un IconButton). */
  right?: ReactNode;
  /** Sobrescribe la acción de volver. */
  onBack?: () => void;
};

/** Cabecera de pantalla simple: volver + título en negrita + acción opcional. Mismo margen en todas. */
export function ScreenHeader({ title, back = true, right, onBack }: ScreenHeaderProps) {
  const router = useRouter();
  const { gutter } = useLayout();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: gutter - 2, paddingVertical: Spacing.one, minHeight: 56 }}>
      {back ? <IconButton icon="arrow-back" label="Volver" onPress={onBack ?? (() => router.back())} /> : null}
      <Text variant="headline" numberOfLines={1} accessibilityRole="header" style={{ flex: 1, paddingLeft: back ? 0 : Spacing.two }}>
        {title}
      </Text>
      {right}
    </View>
  );
}
