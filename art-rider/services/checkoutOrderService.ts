"use server";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { refundKushkiCharge } from "@/lib/kushki";

export async function canCancelCheckoutBooking(orderId: string) {
  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from("checkout_orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order) return { allowed: false, error: "La orden de pago no existe." };
  if (["PARTIALLY_REFUNDED", "REFUNDED"].includes(order.status)) {
    return {
      allowed: false,
      error: "Esta orden ya tuvo un reembolso. Contacta a soporte para otra cancelación.",
    };
  }
  return { allowed: true };
}

/**
 * Ecuador permits a single partial refund per Kushki transaction. We wait until
 * every provider has answered, then refund all rejected provider bookings in
 * one operation. A full rejection uses a full void/refund.
 */
export async function settleCheckoutOrderRefund(orderId: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: order }, { data: bookings }] = await Promise.all([
    admin
      .from("checkout_orders")
      .select("id, status, total_price, kushki_ticket, refund_attempted_at")
      .eq("id", orderId)
      .single(),
    admin
      .from("bookings")
      .select("id, status, total_price")
      .eq("checkout_order_id", orderId),
  ]);

  if (!order || !bookings?.length) return { settled: false };
  if (order.status !== "PAID" || order.refund_attempted_at) return { settled: false };
  if (bookings.some((booking) => booking.status === "AWAITING_SIGNATURES")) {
    return { settled: false };
  }

  const refundAmount = bookings
    .filter((booking) => booking.status === "CANCELLED")
    .reduce((total, booking) => total + booking.total_price, 0);
  if (refundAmount <= 0) return { settled: false };

  // Claim this one allowed refund attempt before calling the external API.
  const attemptedAt = new Date().toISOString();
  const { data: claimed } = await admin
    .from("checkout_orders")
    .update({ refund_attempted_at: attemptedAt, updated_at: attemptedAt })
    .eq("id", orderId)
    .eq("status", "PAID")
    .is("refund_attempted_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return { settled: false };

  try {
    const fullRefund = refundAmount === order.total_price;
    const result = await refundKushkiCharge(
      order.kushki_ticket,
      fullRefund ? undefined : refundAmount,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.data));

    const processedAt = new Date().toISOString();
    await admin
      .from("checkout_orders")
      .update({
        status: fullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refunded_amount: refundAmount,
        refund_processed_at: processedAt,
        updated_at: processedAt,
      })
      .eq("id", orderId);
    return { settled: true, refundAmount };
  } catch (error) {
    console.error("[checkoutOrderService] Kushki refund failed:", error);
    await admin
      .from("checkout_orders")
      .update({ status: "REFUND_FAILED", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    return { settled: false, error: "El reembolso requiere revisión manual." };
  }
}
