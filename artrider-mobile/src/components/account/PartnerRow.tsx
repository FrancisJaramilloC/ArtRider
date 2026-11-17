import { ListRow } from '@/components/ui/ListRow';
import { COPY } from '@/constants/copy';
import type { ProviderProfile } from '@/services/providerService';

export type PartnerRowStatus = ProviderProfile['status'] | null;

/** Etiqueta de la fila de Negocio según el estado: solo «Cambiar a modo Partner» cuando está activo. */
export function partnerRowLabel(status: PartnerRowStatus): string {
  if (status === 'active') return COPY.switchToProviderMode;
  if (status === 'pending') return COPY.providerRequestInReview;
  if (status === 'suspended') return COPY.providerSuspendedRow;
  return COPY.becomeProvider;
}

/** Fila del Perfil para el alta/estado/cambio a modo Partner. `onPress` recibe el estado para decidir el destino. */
export function PartnerRow({ status, onPress }: { status: PartnerRowStatus; onPress: (status: PartnerRowStatus) => void }) {
  return <ListRow icon="storefront-outline" label={partnerRowLabel(status)} onPress={() => onPress(status)} />;
}
