"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

/**
 * Resolves the `providers.id` for the currently authenticated user.
 *
 * This is needed because `listings`, `bookings`, and `packages` now reference
 * `providers(id)` instead of `profiles(id)`. Since `auth.uid()` returns the
 * user's profile UUID, we must look up the corresponding provider record.
 *
 * @returns The provider UUID, or `null` if the user is not authenticated
 *          or has no provider profile.
 */
export async function getMyProviderId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("providers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  return data.id;
}
