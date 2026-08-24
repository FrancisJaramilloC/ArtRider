import { useEffect, useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, useColorScheme, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getMyProviderProfile, becomeProvider, type ProviderProfile } from '@/services/providerService';

const STATUS_INFO: Record<ProviderProfile['status'], { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: 'Pendiente de aprobación', bg: '#fef3c7', text: '#92400e', icon: 'time-outline' },
  active: { label: 'Activo', bg: '#dcfce7', text: '#166534', icon: 'checkmark-circle-outline' },
  suspended: { label: 'Suspendido', bg: '#fee2e2', text: '#991b1b', icon: 'alert-circle-outline' },
};

export function BecomeProviderScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [brandName, setBrandName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    getMyProviderProfile()
      .then((p) => {
        setProfile(p);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const brandNameValid = brandName.trim().length >= 2 && brandName.trim().length <= 80;

  async function handleSubmit() {
    setError(null);

    if (!brandNameValid) {
      setError('El nombre del negocio debe tener entre 2 y 80 caracteres.');
      return;
    }

    setSubmitting(true);
    const result = await becomeProvider({ brandName: brandName.trim(), bio: bio.trim() });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setJustSubmitted(true);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four, zIndex: 1 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Ya es proveedor (o acaba de enviar la solicitud) — muestra su estado, no el formulario
  if (profile || justSubmitted) {
    const status = profile?.status ?? 'pending';
    const info = STATUS_INFO[status];

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <BackButton style={{ position: 'absolute', top: Spacing.four, left: Spacing.four, zIndex: 1 }} />
        <View style={{ flex: 1, padding: Spacing.four, alignItems: 'center', justifyContent: 'center' }}>
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
              paddingVertical: 6,
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
                ? 'Tu cuenta de proveedor está activa. Ya puedes gestionar tu catálogo.'
                : 'Tu cuenta de proveedor ha sido suspendida. Contacta a soporte para más información.'}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Formulario de registro
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ padding: Spacing.four }}>
            <Pressable onPress={() => router.back()} style={{ marginBottom: Spacing.four }}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>

            <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginBottom: Spacing.one }}>
              Configura tu perfil de proveedor
            </ThemedText>
            <ThemedText style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginBottom: Spacing.four }}>
              Una vez enviado, nuestro equipo revisará tu solicitud junto a la verificación de identidad. Te notificaremos cuando tu cuenta esté activa.
            </ThemedText>

            <View
              style={{
                flexDirection: 'row',
                gap: Spacing.two,
                backgroundColor: scheme === 'dark' ? 'rgba(217,119,6,0.15)' : '#fef3c7',
                borderRadius: Radius.lg,
                padding: Spacing.three,
                marginBottom: Spacing.four,
              }}
            >
              <Ionicons name="information-circle" size={18} color="#d97706" />
              <ThemedText style={{ fontSize: 12.5, color: scheme === 'dark' ? '#fbbf24' : '#92400e', flex: 1 }}>
                La aprobación puede tomar 1-3 días hábiles.
              </ThemedText>
            </View>

            {error && (
              <View
                style={{
                  backgroundColor: scheme === 'dark' ? 'rgba(248,113,113,0.15)' : '#fef2f2',
                  borderRadius: Radius.lg,
                  padding: Spacing.three,
                  marginBottom: Spacing.three,
                }}
              >
                <ThemedText style={{ color: colors.destructive, fontSize: 13.5 }}>{error}</ThemedText>
              </View>
            )}

            {/* Nombre del negocio */}
            <View style={{ marginBottom: Spacing.three }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: 6 }}>
                  Nombre de tu negocio / marca *
                </ThemedText>
                <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary }}>{brandName.length}/80</ThemedText>
              </View>
              <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.md, paddingHorizontal: Spacing.three }}>
                <TextInput
                  value={brandName}
                  onChangeText={(t) => setBrandName(t.slice(0, 80))}
                  placeholder="Ej: AudioPro Ecuador"
                  placeholderTextColor={colors.textSecondary}
                  style={{ paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.text }}
                />
              </View>
              <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 4 }}>
                Este nombre será visible públicamente en tus equipos.
              </ThemedText>
            </View>

            {/* Descripción */}
            <View style={{ marginBottom: Spacing.four }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: 6 }}>
                  Descripción breve (opcional)
                </ThemedText>
                <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary }}>{bio.length}/500</ThemedText>
              </View>
              <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.md, paddingHorizontal: Spacing.three }}>
                <TextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 500))}
                  placeholder="Cuéntanos sobre tu negocio, experiencia o especialidad..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  style={{ paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.text, minHeight: 90, textAlignVertical: 'top' }}
                />
              </View>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting || !brandNameValid}
              style={{
                backgroundColor: submitting || !brandNameValid ? colors.backgroundSelected : colors.primary,
                paddingVertical: Spacing.three,
                borderRadius: Radius.lg,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' }}>Enviar solicitud</ThemedText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}