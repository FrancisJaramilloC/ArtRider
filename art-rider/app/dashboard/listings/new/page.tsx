"use client";

import { useActionState } from "react";
import { createListing } from "@/services/listingsService";
import ListingForm from "@/components/features/listings/ListingForm";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewListingPage() {
  const [state, formAction, isPending] = useActionState(createListing, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/listings");
    }
  }, [state, router]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Mis equipos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Publicar nuevo equipo</h1>
        <p className="text-sm text-gray-500 mt-1">Completa los detalles de tu equipo para que los clientes puedan encontrarlo.</p>
      </div>

      {/* Error */}
      {state?.error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5">
          <p className="text-sm text-red-600 font-medium">{state.error}</p>
        </div>
      )}

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <form action={formAction}>
          <ListingForm
            formAction={formAction}
            isPending={isPending}
            submitLabel="Publicar equipo"
          />
        </form>
      </div>
    </div>
  );
}
