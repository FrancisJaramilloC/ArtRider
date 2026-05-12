"use client";

import { useActionState, useEffect } from "react";
import { createListing } from "@/services/listingsService";
import ListingFormWizard from "@/components/features/listings/ListingFormWizard";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";

export default function NewListingPage() {
  const [state, formAction, isPending] = useActionState(createListing, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/provider/catalog");
    }
  }, [state, router]);

  return (
    <div>
      {/* Minimal top header with cancel */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Publicar nuevo equipo</h1>
          <p className="text-sm text-gray-400 mt-0.5">Sigue los pasos para añadir tu equipo al catálogo.</p>
        </div>
        <Link
          href="/provider/catalog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-xl hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
          Cancelar
        </Link>
      </div>

      <ListingFormWizard
        formAction={formAction}
        isPending={isPending}
        serverError={state?.error}
      />
    </div>
  );
}
