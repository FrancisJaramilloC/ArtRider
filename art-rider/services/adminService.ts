"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

// Cliente Admin (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// ============================================================================
// Verificación de Admin
// ============================================================================

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;
  return user.app_metadata?.role === "admin";
}

// ============================================================================
// Gestión de Listings + Specs
// ============================================================================

export type AdminListing = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  daily_price: number;
  is_published: boolean;
  specs: Record<string, unknown>;
  brand: string | null;
  model: string | null;
  cover_image_url: string | null;
  address: { city: string } | null;
  provider: { brand_name: string } | null;
};

export async function getAdminListings(): Promise<AdminListing[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("listings")
    .select("id, title, description, category, daily_price, is_published, specs, brand, model, cover_image_url, addresses(city), providers(brand_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[adminService] Error fetching listings:", error);
    return [];
  }

  return (data || []).map((l: any) => ({
    ...l,
    specs: l.specs || {},
    address: l.addresses || null,
    provider: l.providers || null,
  }));
}

export async function updateListingSpecs(listingId: string, specs: Record<string, unknown>) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return { success: false, error: "No autorizado" };

  const admin = getAdminClient();
  const { error } = await admin
    .from("listings")
    .update({ specs, updated_at: new Date().toISOString() })
    .eq("id", listingId);

  if (error) {
    console.error("[adminService] Error updating specs:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Gestión de Solicitudes Advisory
// ============================================================================

export type AdminAdvisoryRequest = {
  id: string;
  created_at: string;
  event_type_slug: string;
  guest_count: number;
  venue_type_slug: string;
  activities: string[];
  budget_min: number | null;
  budget_max: number | null;
  event_date: string | null;
  event_notes: string | null;
  ecs_score: number;
  ecs_level: string;
  audio_requirement: string;
  lighting_requirement: string;
  stage_requirement: string;
  power_backup: boolean;
  generated_ptr: Record<string, unknown> | null;
  status: string;
  advisory_proposals: any[];
};

export async function getAdvisoryRequests(): Promise<AdminAdvisoryRequest[]> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return [];

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("advisory_requests")
    .select("*, advisory_proposals(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[adminService] Error fetching advisory_requests:", error);
    return [];
  }

  return data || [];
}

export async function getAdvisoryRequestDetail(requestId: string) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return null;

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("advisory_requests")
    .select("*, advisory_proposals(*)")
    .eq("id", requestId)
    .single();

  if (error) {
    console.error("[adminService] Error fetching request detail:", error);
    return null;
  }

  return data;
}
