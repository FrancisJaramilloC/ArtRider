import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!sig) throw new Error("No signature");
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // Handle the event
  switch (event.type) {
    case "identity.verification_session.verified": {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.user_id;

      if (userId) {
        // Update user's verification status
        await supabaseAdmin
          .from("identity_verifications")
          .update({ status: "verified", verified_at: new Date().toISOString() })
          .eq("user_id", userId);

        // Notify user
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "identity_verified",
          title: "Identidad verificada",
          body: "Tu identidad ha sido verificada con éxito. Ya puedes reservar equipos de alto valor.",
          href: "/profile",
        });
      }
      break;
    }

    case "identity.verification_session.requires_input": {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.user_id;

      if (userId) {
        await supabaseAdmin
          .from("identity_verifications")
          .update({ status: "rejected" })
          .eq("user_id", userId);

        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "identity_rejected",
          title: "Verificación de identidad fallida",
          body: "No pudimos verificar tu identidad. Por favor, inténtalo de nuevo con un documento válido y claro.",
          href: "/profile", // Or a dedicated page to retry
        });
      }
      break;
    }

    // You can handle canceled or processing states as well
  }

  return NextResponse.json({ received: true });
}
