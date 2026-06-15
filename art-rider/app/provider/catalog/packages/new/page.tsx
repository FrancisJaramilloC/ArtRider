import { redirect } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { getMyProviderProfile } from "@/services/providerService";
import { getMyListings } from "@/services/listingsService";
import PackageFormWizard from "@/components/features/listings/PackageFormWizard";

export const metadata = { title: "Crear paquete · ArtRider" };

export default async function NewPackagePage() {
  const provider = await getMyProviderProfile();
  if (!provider) redirect("/become-a-provider");

  const allListings = await getMyListings();
  const publishedListings = allListings.filter((l) => l.is_published);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Crear nuevo paquete</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Agrupa equipos publicados para ofrecerlos juntos.
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

      <PackageFormWizard publishedListings={publishedListings} />
    </div>
  );
}
