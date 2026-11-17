import { COPY } from '@/constants/copy';
import { useState } from 'react';
import { View, Pressable, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBanner, FormField } from '@/components/ui/FormField';
import { ScreenSkeleton } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius, StatusColors, type BookingStatusKey, MinTouch } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useForm } from '@/hooks/useForm';
import { maxLength, minLength, required } from '@/utils/validation';
import { useLayout } from '@/hooks/use-layout';
import { getMyProviderProfile, becomeProvider, type ProviderProfile } from '@/services/providerService';

const STATUS_INFO: Record<ProviderProfile['status'], { label: string; tone: BookingStatusKey; icon: string }> = {
  pending: { label: 'Pendiente de aprobación', tone: 'pending', icon: 'time-outline' },
  active: { label: 'Activo', tone: 'confirmed', icon: 'checkmark-circle-outline' },
  suspended: { label: 'Suspendido', tone: 'cancelled', icon: 'alert-circle-outline' },
};

const RULES = {
  brandName: [
    required('Ingresa el nombre de tu negocio'),
    minLength(2, 'El nombre debe tener al menos 2 caracteres'),
    maxLength(80, 'El nombre admite hasta 80 caracteres'),
  ],
  bio: [maxLength(500, 'La descripción admite hasta 500 caracteres')],
};

export function BecomeProviderScreen() {
  const { gutter } = useLayout();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  // Si falla la consulta del perfil se muestra un error con «Reintentar» (antes se mostraba el formulario como si no fuera proveedor).
  const profileLoad = useAsyncData<ProviderProfile | null>(getMyProviderProfile);
  const profile = profileLoad.data;
  const loading = profileLoad.status === 'loading';

  const form = useForm({ brandName: '', bio: '' }, RULES);
  const brandName = form.values.brandName;
  const [justSubmitted, setJustSubmitted] = useState(false);

  function handleSubmit() {
    form.submit(async (values) => {
      const result = await becomeProvider({ brandName: values.brandName.trim(), bio: values.bio.trim() });
      if (result.error) return result.error;
      setJustSubmitted(true);
      return null;
    });
  }

  if (profileLoad.status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four, zIndex: 1 }} />
        <ErrorState error={profileLoad.error} onRetry={profileLoad.reload} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four, zIndex: 1 }} />
        <ScreenSkeleton />
      </SafeAreaView>
    );
  }

  // Ya es proveedor (o acaba de enviar la solicitud) — muestra su estado, no el formulario
  if (profile || justSubmitted) {
    const status = profile?.status ?? 'pending';
    const statusInfo = STATUS_INFO[status];
    const toneColors = StatusColors[scheme === 'dark' ? 'dark' : 'light'][statusInfo.tone];
    const info = { ...statusInfo, bg: toneColors.bg, text: toneColors.fg };

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four, zIndex: 1 }} />
        <View style={{ flex: 1, paddingHorizontal: gutter, paddingVertical: Spacing.four, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: info.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.four,
            }}
          >
            <Ionicons name={info.icon as any} size={34} color={info.text} />
          </View>

          <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text, textAlign: 'center', marginBottom: Spacing.two }}>
            {profile?.brand_name ?? brandName}
          </ThemedText>

          <View
            style={{
              backgroundColor: info.bg,
              paddingHorizontal: Spacing.three,
              paddingVertical: Spacing.two,
              borderRadius: 999,
              marginBottom: Spacing.four,
            }}
          >
            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 12.5, color: info.text }}>{info.label}</ThemedText>
          </View>

          <ThemedText style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            {status === 'pending'
              ? 'Tu solicitud está siendo revisada. Te notificaremos cuando tu cuenta esté activa (1-3 días hábiles).'
              : status === 'active'
                ? COPY.providerAccountActive
                : COPY.providerAccountSuspended}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Formulario de registro
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={form.scrollRef} onScroll={form.onScroll} scrollEventThrottle={16} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: gutter, paddingVertical: Spacing.four }}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={{ marginBottom: Spacing.four, minWidth: MinTouch, minHeight: MinTouch, justifyContent: 'center' }}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>

            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginBottom: Spacing.one }}>
              {COPY.providerSetupTitle}
            </ThemedText>
            <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginBottom: Spacing.four }}>
              Una vez enviado, nuestro equipo revisará tu solicitud junto a la verificación de identidad. Te notificaremos cuando tu cuenta esté activa.
            </ThemedText>

            <View
              style={{
                flexDirection: 'row',
                gap: Spacing.two,
                backgroundColor: StatusColors[scheme === 'dark' ? 'dark' : 'light'].pending.bg,
                borderRadius: Radius.lg,
                padding: Spacing.three,
                marginBottom: Spacing.four,
              }}
            >
              <Ionicons name="information-circle" size={18} color={StatusColors[scheme === 'dark' ? 'dark' : 'light'].pending.fg} />
              <ThemedText style={{ fontSize: 12.5, color: StatusColors[scheme === 'dark' ? 'dark' : 'light'].pending.fg, flex: 1 }}>
                La aprobación puede tomar 1-3 días hábiles.
              </ThemedText>
            </View>

            {form.submitError ? (
              <View style={{ marginBottom: Spacing.three }}>
                <FormErrorBanner message={form.submitError} onRetry={form.retry} retrying={form.submitting} />
              </View>
            ) : null}

            <View style={{ gap: Spacing.three, marginBottom: Spacing.four }}>
              <FormField
                label="Nombre de tu negocio / marca"
                placeholder="Ej: AudioPro Ecuador"
                hint={`Este nombre será visible públicamente en tus equipos. ${brandName.length}/80`}
                maxLength={80}
                returnKeyType="next"
                {...form.field('brandName')}
              />
              <FormField
                label="Descripción breve (opcional)"
                placeholder="Cuéntanos sobre tu negocio, experiencia o especialidad..."
                hint={`${form.values.bio.length}/500`}
                multiline
                maxLength={500}
                {...form.field('bio')}
              />
            </View>

            <Button label="Enviar solicitud" onPress={handleSubmit} loading={form.submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}