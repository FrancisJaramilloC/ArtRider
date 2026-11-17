import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { COPY } from '@/constants/copy';
import { Spacing, StatusColors, type BookingStatusKey } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ProviderProfile } from '@/services/providerService';

type Status = ProviderProfile['status'];

const STATUS_INFO: Record<Status, { label: string; tone: BookingStatusKey; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pendiente de aprobación', tone: 'pending', icon: 'time-outline' },
  active: { label: 'Activo', tone: 'confirmed', icon: 'checkmark-circle-outline' },
  suspended: { label: 'Suspendido', tone: 'cancelled', icon: 'alert-circle-outline' },
};

export type ProviderStatusViewProps = {
  status: Status;
  brandName: string;
  /** Acaba de enviar la solicitud: el título pasa a «Solicitud enviada». */
  justSubmitted?: boolean;
  onBack: () => void;
};

/** Estado de la solicitud de Partner (enviada / en revisión / activa / suspendida) con salida clara al Perfil. */
export function ProviderStatusView({ status, brandName, justSubmitted = false, onBack }: ProviderStatusViewProps) {
  const { gutter } = useLayout();
  const scheme = useColorScheme();
  const tone = StatusColors[scheme === 'dark' ? 'dark' : 'light'][STATUS_INFO[status].tone];
  const info = STATUS_INFO[status];

  const title = status === 'pending' ? (justSubmitted ? COPY.providerRequestSent : COPY.providerRequestInReview) : brandName;
  const body =
    status === 'pending'
      ? justSubmitted
        ? COPY.providerRequestSentBody
        : COPY.providerRequestInReviewBody
      : status === 'active'
        ? COPY.providerAccountActive
        : COPY.providerAccountSuspended;

  return (
    <View style={{ flex: 1, paddingHorizontal: gutter, paddingVertical: Spacing.four, alignItems: 'center', justifyContent: 'center', gap: Spacing.three }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={info.icon} size={34} color={tone.fg} />
      </View>
      <Text variant="headline" accessibilityRole="header" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {status === 'pending' && brandName ? (
        <Text variant="bodyStrong" color="textSecondary" style={{ textAlign: 'center' }}>
          {brandName}
        </Text>
      ) : null}
      <View style={{ backgroundColor: tone.bg, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 }}>
        <Text variant="captionStrong" style={{ color: tone.fg }}>
          {info.label}
        </Text>
      </View>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
        {body}
      </Text>
      <View style={{ alignSelf: 'stretch', marginTop: Spacing.three }}>
        <Button label={COPY.backToProfile} onPress={onBack} />
      </View>
    </View>
  );
}
