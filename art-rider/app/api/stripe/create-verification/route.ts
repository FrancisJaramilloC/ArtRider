import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any, // Use the latest API version or your configured version
});

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check existing verification status
    const { data: verification } = await supabase
      .from("identity_verifications")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (verification?.status === "verified") {
      return NextResponse.json({ error: "Already verified" }, { status: 400 });
    }

    // Create a VerificationSession
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: user.id, // We'll use this in the webhook to map back to Supabase
      },
    });

    // We can save the intent id to the identity_verifications table as 'provider_ref' if we want,
    // but the most important part is mapping the user via metadata when the webhook hits.
    await supabase.from("identity_verifications").upsert({
      user_id: user.id,
      provider_ref: verificationSession.id,
      status: "pending",
    }, { onConflict: "user_id" });

    return NextResponse.json({
      client_secret: verificationSession.client_secret,
    });
  } catch (error: any) {
    console.error("[Stripe Identity] Error creating session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
