import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { getMyProviderProfile } from "@/services/providerService";
import { getMyListings } from "@/services/listingsService";
import { getMyPackageById } from "@/services/packagesService";
import PackageFormWizard from "@/components/features/listings/PackageFormWizard";
import type { PackageInitialData } from "@/components/features/listings/PackageFormWizard";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const provider = await getMyProviderProfile();
  if (!provider) redirect("/become-a-provider");

  const [pkg, allListings] = await Promise.all([
    getMyPackageById(id),
    getMyListings(),
  ]);

  if (!pkg) notFound();

  // Solo listar equipos publicados como candidatos del wizard
  const publishedListings = allListings.filter((l) => l.is_published);

  const initialData: PackageInitialData = {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description ?? "",
    dailyPrice: (pkg.daily_price / 100).toFixed(2),
    publishNow: pkg.is_published,
    existingCoverUrl: pkg.cover_image_url ?? null,
    // Los items del paquete pre-seleccionados — incluir también los no publicados
    // que el proveedor ya tenía en el paquete (podrían haberse ocultado luego)
    selectedListingIds: (pkg.items ?? []).map((it) => it.listing_id),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editar paquete</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Modifica el título, equipos, precio o foto de portada.
          </p>
        </div>
        <Link
          href="/provider/catalog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-xl hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
          Cancelar
        </Link>
      </div>
      <PackageFormWizard publishedListings={publishedListings} initialData={initialData} />
    </div>
  );
}
