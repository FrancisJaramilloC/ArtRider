import { getClientBookings } from "@/services/bookingsService";
import BookingsView from "@/components/features/bookings/BookingsView";

// pagina principal de reservas
export default async function BookingsPage() {
  const clientBookings = await getClientBookings();

  // Renderizado de la vista de reservas
  return (
    <BookingsView
      clientBookings={clientBookings}
    />
  );
}
