import { notFound, redirect } from "next/navigation";
import BookingFlowClient from "@/components/features/bookings/BookingFlowClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pago de Rider Técnico - ArtRider",
  description: "Proceso de pago seguro para tu propuesta",
};

export default async function ProposalCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const proposalId = resolvedParams.id;

  const supabase = await createSupabaseServerClient();
  const { data: proposal, error } = await supabase
    .from("advisory_proposals")
    .select("*, advisory_requests(event_date)")
    .eq("id", proposalId)
    .single();

  if (error || !proposal) {
    notFound();
  }

  // Si no está firmada, mandarlo de regreso
  if (proposal.status !== "signed" && proposal.status !== "accepted") {
    redirect(`/cotizar`);
  }

  const eventDate = proposal.advisory_requests?.event_date || new Date().toISOString();
  
  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Reutilizamos el BookingFlowClient inyectando datos de la propuesta */}
        <BookingFlowClient
          listing={{
            id: proposal.id, // usamos el id de la propuesta para el flujo
            title: `Paquete Rider Técnico (${proposal.items.length} equipos)`,
            description: "Paquete de alquiler técnico generado por ArtRider",
            price_per_day: proposal.total,
            provider: { brand_name: "ArtRider Marketplace" },
            cover_image_url: "https://images.unsplash.com/photo-1470229722913-7c090be5bb10?w=800&auto=format&fit=crop", 
          }}
          initialStart={eventDate}
          initialEnd={eventDate}
          priceCalc={{
            total: proposal.total,
            days: 1,
            dailyPrice: proposal.total,
          }}
        />
      </div>
    </div>
  );
}
