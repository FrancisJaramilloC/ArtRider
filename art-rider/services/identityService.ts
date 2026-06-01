"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

const THRESHOLD_CENTS = 5000; // $50.00 per day requires KYC

export async function getMyVerificationStatus(): Promise<"pending" | "verified" | "rejected" | "none"> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return "none";

    const { data, error } = await supabase
      .from("identity_verifications")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (error || !data) return "none";

    return data.status as "pending" | "verified" | "rejected";
  } catch (e) {
    console.error("[identityService] getMyVerificationStatus error:", e);
    return "none";
  }
}
