"use client";

import type { BookingWithDetails } from "@/services/bookingsService";
import ClientBookingsSection from "./ClientBookingsSection";

interface BookingsViewProps {
  clientBookings: BookingWithDetails[];
}

export default function BookingsView({ clientBookings }: BookingsViewProps) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold text-[#111111]">Mis Reservas</h1>
        <p className="text-[#8E8E93] mt-1 text-sm">
          Consulta y gestiona los equipos que has alquilado
        </p>
      </div>

      <ClientBookingsSection bookings={clientBookings} />
    </div>
  );
}
