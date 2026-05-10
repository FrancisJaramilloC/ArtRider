import { getClientBookings, getProviderBookings } from "@/services/bookingsService";
import { getMyProviderProfile } from "@/services/providerService";
import BookingsView from "@/components/features/bookings/BookingsView";

export default async function BookingsPage() {
  const [clientBookings, providerProfile] = await Promise.all([
    getClientBookings(),
    getMyProviderProfile().catch(() => null),
  ]);

  const isProvider = !!providerProfile;
  const providerBookings = isProvider ? await getProviderBookings() : null;

  return (
    <BookingsView
      clientBookings={clientBookings}
      providerBookings={providerBookings}
      isProvider={isProvider}
    />
  );
}
