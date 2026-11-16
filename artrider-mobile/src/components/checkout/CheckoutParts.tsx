import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

/** Esqueleto de carga para cualquier paso del checkout (cabecera + bloques). */
export function CheckoutLoading() {
  const colors = useTheme();
  const { gutter } = useLayout();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="" />
      <View style={{ padding: gutter, gap: Spacing.three }}>
        <Skeleton height={72} radius={Radius.card} />
        <Skeleton height={132} radius={Radius.card} />
        <Skeleton height={220} radius={Radius.card} />
      </View>
    </SafeAreaView>
  );
}

/** Fila de ítem del resumen: miniatura, título y subtítulo (fechas, cantidad). */
export function SummaryItem({ title, subtitle, extra, imageUri, size = 64 }: { title: string; subtitle: string; extra?: string; imageUri?: string | null; size?: number }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: size, height: size }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={size / 3} color={colors.textMuted} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {subtitle}
        </Text>
        {extra ? (
          <Text variant="caption" color="textSecondary">
            {extra}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Aviso de error en línea (mensaje del servicio de pago o de reservas). */
export function ErrorBanner({ message }: { message: string }) {
  const colors = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', backgroundColor: colors.backgroundElement, borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.destructive, padding: Spacing.three }}
    >
      <Ionicons name="alert-circle" size={20} color={colors.destructive} />
      <Text variant="body" color="destructive" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

export type CheckoutShellProps = {
  title: string;
  children: ReactNode;
};

/** Marco de los pasos de pago: cabecera con volver, teclado y scroll con margen estándar. */
export function CheckoutShell({ title, children }: CheckoutShellProps) {
  const colors = useTheme();
  const { gutter, contentWidth } = useLayout();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={title} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: gutter, paddingBottom: Spacing.six, gap: Spacing.four, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Tarjeta neutra para agrupar el desglose de precios. */
export function SummaryCard({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Spacing.three }}>{children}</View>;
}
