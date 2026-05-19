import { getClientBookings, getProviderBookings } from "@/services/bookingsService";
import { getMyProviderProfile } from "@/services/providerService";
import BookingsView from "@/components/features/bookings/BookingsView";

// pagina principal de reservas
export default async function BookingsPage() {
  const [clientBookings, providerProfile] = await Promise.all([
    getClientBookings(),
    getMyProviderProfile().catch(() => null),
  ]);

  // Si el usuario es proveedor, obtener sus reservas
  const isProvider = !!providerProfile;
  const providerBookings = isProvider ? await getProviderBookings() : null;

  // Renderizado de la vista de reservas
  return (
    <BookingsView
      clientBookings={clientBookings}
      providerBookings={providerBookings}
      isProvider={isProvider}
    />
  );
}
