import { getProviderBookings } from "@/services/bookingsService";
import ProviderBookingsWrapper from "./ProviderBookingsWrapper";

export const dynamic = "force-dynamic";

export default async function BookingsProviderPage() {
  const bookings = await getProviderBookings();

  return (
    <ProviderBookingsWrapper bookings={bookings} />
  );
}
