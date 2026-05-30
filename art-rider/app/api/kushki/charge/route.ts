import { NextResponse } from "next/server";
import { createBooking } from "@/services/bookingsService";

/** POST /api/kushki/charge — Procesa pago y crea reserva */
export async function POST(request: Request) {
  try {
    const { token, amount, listingId, startDate, endDate } = await request.json();

    // TODO: Reemplazar con llamada real a Kushki SDK
    // const kushkiRes = await fetch("https://api.kushkipagos.com/card/v1/charges", { ... })
    const isSuccess = true;

    if (!isSuccess) {
      return NextResponse.json({ error: "El pago fue rechazado por Kushki" }, { status: 400 });
    }

    // Pago exitoso → crear reserva (maneja units, notificaciones, emails)
    const result = await createBooking(listingId, startDate, endDate);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookingId: result.bookingId ?? "simulated-id" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error procesando el pago: " + error.message },
      { status: 500 }
    );
  }
}
