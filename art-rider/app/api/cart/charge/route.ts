import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { buildCartQuote, createMultiProviderOrder } from "@/services/cartCheckoutService";
import { chargeKushkiToken, refundKushkiCharge } from "@/lib/kushki";
import { createNotification } from "@/services/notificationsService";

export async function POST(request: Request) {
  let chargedTicket: string | null = null;
  let chargedAmount = 0;

  try {
    const payload = await request.json();
    if (!payload?.token || typeof payload.token !== "string") {
      return NextResponse.json({ error: "Token de pago inválido." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

    // Recalculate prices and availability on the server. Client totals are ignored.
    const quote = await buildCartQuote(payload, user.id);
    chargedAmount = quote.total;

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();
    const names = (profile?.full_name || "Cliente ArtRider").trim().split(/\s+/);

    const charge = await chargeKushkiToken({
      token: payload.token,
      amountCents: quote.total,
      email: profile?.email || user.email || "cliente@artrider.com",
      firstName: names[0],
      lastName: names.slice(1).join(" ") || "ArtRider",
    });
    if (!charge.approved || !charge.ticketNumber) {
      console.error("[cart charge] Kushki rejected:", charge.raw);
      return NextResponse.json({ error: charge.error }, { status: 400 });
    }
    chargedTicket = charge.ticketNumber;

    // Atomic DB operation. If it fails, the catch block compensates the charge.
    const order = await createMultiProviderOrder(quote, user.id, chargedTicket);

    if (quote.proposalId) {
      await admin
        .from("advisory_proposals")
        .update({ status: "paid" })
        .eq("id", quote.proposalId);
    }

    const providerGroups = new Map<string, { userId: string; titles: string[] }>();
    for (const item of quote.items) {
      const group = providerGroups.get(item.providerId) ?? {
        userId: item.providerUserId,
        titles: [],
      };
      group.titles.push(`${item.quantity}× ${item.title}`);
      providerGroups.set(item.providerId, group);
    }

    await Promise.allSettled([...providerGroups.values()].map((group) =>
      createNotification({
        userId: group.userId,
        type: "booking_request",
        title: "Nueva solicitud desde un carrito",
        body: group.titles.join(", "),
        href: "/provider/bookingsProvider",
        metadata: { checkoutOrderId: order.orderId },
      }),
    ));

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      bookingIds: order.bookingIds,
    });
  } catch (error) {
    console.error("[cart charge] checkout failed:", error);
    let paymentReversed = false;
    if (chargedTicket) {
      try {
        const reversal = await refundKushkiCharge(chargedTicket, chargedAmount);
        paymentReversed = reversal.ok;
        if (!reversal.ok) console.error("[cart charge] compensation failed:", reversal.data);
      } catch (refundError) {
        console.error("[cart charge] compensation error:", refundError);
      }
    }

    return NextResponse.json(
      {
        error: chargedTicket
          ? paymentReversed
            ? "No se pudo crear la orden. El cobro fue anulado automáticamente."
            : "No se pudo crear la orden y la anulación requiere revisión. Contacta a soporte."
          : error instanceof Error
            ? error.message
            : "No se pudo procesar el carrito.",
      },
      { status: 500 },
    );
  }
}
