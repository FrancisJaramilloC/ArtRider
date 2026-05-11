import { updateListing } from "@/services/listingsService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import EditListingClient from "@/app/provider/catalog/[id]/edit/EditListingClient";
import { getMyProviderId } from "@/services/helpers/getMyProviderId";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const providerId = await getMyProviderId();

  if (!providerId) notFound();

  const supabase = await createSupabaseServerClient();

  // Fetch listing including unpublished — only the owner can edit their own drafts
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("provider_id", providerId)
    .is("deleted_at", null)
    .single();

  if (error || !listing) notFound();

  const boundUpdate = updateListing.bind(null, id);

  return <EditListingClient listing={listing} updateAction={boundUpdate} />;
}
