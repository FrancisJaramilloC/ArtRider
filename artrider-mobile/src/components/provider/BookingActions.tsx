import { useState } from 'react';
import { Alert } from 'react-native';

import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { finalizeBooking, respondToBooking, type ProviderBooking } from '@/services/providerService';

/**
 * Acciones del proveedor sobre una reserva. Reutiliza `respondToBooking` y `finalizeBooking` tal cual:
 * este hook solo gestiona el estado de la interfaz (ocupado, hojas de confirmación, avisos de error).
 */
export function useBookingActions(booking: ProviderBooking, onChanged: () => void) {
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);

  async function respond(action: 'accept' | 'reject') {
    if (busy) return; // evita el doble toque
    setBusy(true);
    const result = await respondToBooking(booking.booking_id, action);
    setBusy(false);
    if (result.error) {
      Alert.alert('No se pudo completar', result.error);
      return;
    }
    onChanged();
  }

  async function finalize(rating?: number, comment?: string) {
    const result = await finalizeBooking(booking.booking_id, rating, comment);
    setShowFinalize(false);
    if (result.error) {
      Alert.alert('No se pudo completar', result.error);
      return;
    }
    onChanged();
  }

  const sheets = (
    <>
      <ConfirmSheet
        visible={showReject}
        title={booking.status === 'ACTIVE' ? 'Cancelar reserva' : 'Rechazar reserva'}
        message="Esto reembolsará automáticamente al cliente si ya se cobró. Esta acción no se puede deshacer."
        confirmLabel={booking.status === 'ACTIVE' ? 'Sí, cancelar' : 'Rechazar'}
        destructive
        loading={busy}
        onCancel={() => setShowReject(false)}
        onConfirm={() => {
          // Cierra la hoja primero: así un posible aviso de error no choca con su cierre.
          setShowReject(false);
          respond('reject');
        }}
      />
      <ReviewModal
        visible={showFinalize}
        title="Finalizar y calificar"
        subtitle={`¿Cómo fue tu experiencia con ${booking.client_name ?? 'este cliente'}?`}
        onCancel={() => setShowFinalize(false)}
        onSubmit={async (rating, comment) => finalize(rating, comment)}
        submitLabel="Finalizar reserva"
        allowSkip
        onSkip={() => finalize()}
      />
    </>
  );

  return {
    busy,
    accept: () => respond('accept'),
    askReject: () => setShowReject(true),
    askFinalize: () => setShowFinalize(true),
    sheets,
  };
}
