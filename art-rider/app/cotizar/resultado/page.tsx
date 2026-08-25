import { getAdvisoryRequest } from "@/services/advisoryService";
import { redirect } from "next/navigation";
import ProposalView from "./ProposalView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import LandingFooter from "@/components/features/home/LandingFooter";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata = {
  title: "Tu Propuesta | ArtRider",
};

export default async function ResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string }>;
}) {
  const { requestId } = await searchParams;

  if (!requestId) {
    redirect("/cotizar");
  }

  const res = await getAdvisoryRequest(requestId);
  
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!res.success || !res.request) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar initialUser={user} />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
            <h1 className="text-xl font-bold mb-4">No pudimos cargar la solicitud</h1>
            <p className="text-gray-500 mb-8">{res.error || "La solicitud no existe o no tienes permiso para verla."}</p>
            <Link href="/cotizar" className="text-black underline font-medium flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Volver a intentar
            </Link>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar initialUser={user} />
      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProposalView request={res.request} proposals={res.proposals || []} />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
