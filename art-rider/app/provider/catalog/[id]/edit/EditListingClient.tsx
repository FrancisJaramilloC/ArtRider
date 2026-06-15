"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ListingForm from "@/components/features/listings/ListingForm";
import Link from "next/link";

//  Props del formulario de edición de listado
type Props = {
  listing: any;
  updateAction: (prevState: any, formData: FormData) => Promise<any>;
};

//  Componente del formulario de edición de listado
export default function EditListingClient({ listing, updateAction }: Props) {
  const [state, formAction, isPending] = useActionState(updateAction, null);
  const router = useRouter();

  //  Limpieza de URLs de objetos generadas para evitar fugas de memoria
  useEffect(() => {
    if (state?.success) {
      router.push("/provider/catalog");
    }
  }, [state, router]);

  //  Renderizado del formulario
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/provider/catalog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Mis equipos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar equipo</h1>
        <p className="text-sm text-gray-500 mt-1">Los cambios se aplican inmediatamente al guardar.</p>
      </div>

      {/*  Estado de error  */}
      {state?.error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5">
          <p className="text-sm text-red-600 font-medium">{state.error}</p>
        </div>
      )}

      {/*  Card del formulario  */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <form action={formAction}>
          <ListingForm
            formAction={formAction}
            isPending={isPending}
            defaultValues={{
              title: listing.title,
              brand: listing.brand,
              model: listing.model,
              category: listing.category,
              dailyPrice: listing.daily_price,
              description: listing.description,
              cover_image_url: listing.cover_image_url,
              is_published: listing.is_published,
              city: listing.address?.city ?? undefined,
              state: listing.address?.state ?? undefined,
              latitude: listing.address?.latitude ?? null,
              longitude: listing.address?.longitude ?? null,
            }}
            submitLabel="Guardar cambios"
          />
        </form>
      </div>
    </div>
  );
}
