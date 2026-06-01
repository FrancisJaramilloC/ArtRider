import { NextResponse } from "next/server";
import { createBooking } from "@/services/bookingsService";

/** POST /api/kushki/charge — Procesa pago y crea reserva */
export async function POST(request: Request) {
  try {
    const { token, amount, listingId, startDate, endDate } = await request.json();

    const privateKey = process.env.KUSHKI_PRIVATE_MERCHANT_ID;
    if (!privateKey) throw new Error("Missing Kushki Private Key");

    // Nota: Regresamos a "charges" porque "preAuthorization" requiere activación manual
    // por parte del equipo de Kushki en esta cuenta UAT (error K041).
    const kushkiRes = await fetch("https://api-uat.kushkipagos.com/card/v1/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Private-Merchant-Id": privateKey
      },
      body: JSON.stringify({
        token: token,
        fullResponse: "v2",
        amount: {
          subtotalIva: 0,
          subtotalIva0: amount / 100, // Convert from cents to dollars (4500 -> 45)
          ice: 0,
          iva: 0,
          currency: "USD"
        },
        contactDetails: {
          documentType: "CC",
          documentNumber: "1700000000",
          email: "test@artrider.com",
          firstName: "Cliente",
          lastName: "ArtRider"
        }
      })
    });

    const kushkiData = await kushkiRes.json();

    if (!kushkiRes.ok || !kushkiData.isSuccessful) {
      console.error("Kushki Error:", kushkiData);
      return NextResponse.json({ 
        error: kushkiData.message || kushkiData.details?.responseMessage || "El pago fue rechazado por el banco" 
      }, { status: 400 });
    }

    // Pago exitoso → crear reserva (maneja units, notificaciones, emails)
    const result = await createBooking(listingId, startDate, endDate, kushkiData.ticketNumber);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookingId: result.bookingId });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error procesando el pago: " + error.message },
      { status: 500 }
    );
  }
}
