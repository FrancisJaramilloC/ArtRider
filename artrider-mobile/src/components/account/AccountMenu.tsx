import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/Avatar';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TabScreen } from '@/components/ui/TabScreen';
import { Text } from '@/components/ui/Text';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { useColorSchemeContext } from '@/contexts/ColorSchemeContext';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export type AccountMenuProps = {
  title: string;
  fullName: string | null | undefined;
  avatarUrl: string | null | undefined;
  onOpenProfile: () => void;
  /** Secciones agrupadas (Negocio, Cuenta, Soporte…): cada una con su título y sus filas. */
  children: ReactNode;
  onLogout: () => void;
};

/**
 * Estructura única de Perfil (Rider) y Menú (Partner): tarjeta de usuario, Apariencia
 * (Claro/Oscuro), secciones agrupadas con filas de 56pt y «Cerrar sesión». Solo cambian las filas.
 */
export function AccountMenu({ title, fullName, avatarUrl, onOpenProfile, children, onLogout }: AccountMenuProps) {
  const colors = useTheme();
  const { gutter, bottomInset } = useLayout();
  const { colorScheme, setOverride } = useColorSchemeContext();

  return (
    <TabScreen title={title}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Spacing.two, paddingBottom: bottomInset + Spacing.four }}
      >
        <Pressable
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel={`${fullName ?? 'Tu perfil'}. Ver perfil`}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.three,
              backgroundColor: colors.backgroundElement,
              borderRadius: Radius.card,
              padding: Rhythm.cardPadding + Spacing.one,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Avatar uri={avatarUrl} name={fullName} size={56} />
          <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
            <Text variant="subtitle" numberOfLines={1}>
              {fullName ?? 'Tu perfil'}
            </Text>
            <Text variant="caption" color="primary">
              Ver perfil
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <ListSection title="Apariencia">
          <SegmentedControl
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
            value={colorScheme}
            onChange={setOverride}
          />
        </ListSection>

        {children}

        <View style={{ borderTopWidth: 1, borderColor: colors.border, marginTop: Rhythm.section }}>
          <ListRow icon="log-out-outline" label="Cerrar sesión" onPress={onLogout} destructive />
        </View>
      </ScrollView>
    </TabScreen>
  );
}

