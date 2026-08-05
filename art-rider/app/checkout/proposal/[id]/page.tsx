import { notFound, redirect } from "next/navigation";
import AdvisoryCartLoader from "@/components/cart/AdvisoryCartLoader";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carrito de Rider Técnico - ArtRider",
  description: "Prepara el pago multi-proveedor de tu propuesta.",
};

export default async function ProposalCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proposalId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/checkout/proposal/${proposalId}`);

  const { data: proposal, error } = await supabase
    .from("advisory_proposals")
    .select("id, status, items, advisory_requests(event_date, client_id)")
    .eq("id", proposalId)
    .single();
  if (error || !proposal) notFound();
  if (!['signed', 'accepted'].includes(proposal.status)) redirect("/cotizar");
  const advisoryRequest = Array.isArray(proposal.advisory_requests)
    ? proposal.advisory_requests[0]
    : proposal.advisory_requests;
  if (advisoryRequest?.client_id !== user.id) notFound();

  const eventDate = advisoryRequest?.event_date;
  if (!eventDate) redirect("/cotizar");
  const items = (proposal.items ?? []).map((item: {
    listing_id: string;
    title: string;
    unit_price: number;
    quantity: number;
  }) => ({
    listingId: item.listing_id,
    title: item.title,
    dailyPrice: item.unit_price,
    quantity: item.quantity,
  }));

  return (
    <div className="bg-gray-50 min-h-screen px-4">
      <div className="max-w-6xl mx-auto">
        <AdvisoryCartLoader items={items} eventDate={eventDate} proposalId={proposal.id} />
      </div>
    </div>
  );
}
