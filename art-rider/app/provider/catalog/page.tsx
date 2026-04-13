import { getMyListings, togglePublish, deleteListing } from "@/services/listingsService";
import { getMyProviderProfile } from "@/services/providerService";
import Link from "next/link";
import { redirect } from "next/navigation";
import ListingsManagerClient from "./ListingsManagerClient";

export default async function MyListingsPage() {
  const provider = await getMyProviderProfile();

  if (!provider) {
    redirect("/become-a-provider");
  }

  const listings = await getMyListings();
  const published = listings.filter((l) => l.is_published).length;
  const drafts = listings.filter((l) => !l.is_published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis equipos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {published} publicado{published !== 1 ? "s" : ""} · {drafts} borrador{drafts !== 1 ? "es" : ""}
          </p>
        </div>

        {provider.status === "active" ? (
          <Link
            href="/provider/catalog/new"
            className="inline-flex items-center gap-2 bg-[#875B9A] hover:bg-[#6a437a] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo equipo
          </Link>
        ) : (
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            ⏳ Pendiente de aprobación
          </span>
        )}
      </div>

      {/* Pending approval notice */}
      {provider.status === "pending" && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Cuenta pendiente de aprobación</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Tu solicitud de cuenta de proveedor está siendo revisada por nuestro equipo junto a la verificación de identidad (KYC). Este proceso toma 1-3 días hábiles.
            </p>
          </div>
        </div>
      )}

      {/* Listings grid / empty state */}
      {listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-center gap-4">
          <span className="text-5xl">📦</span>
          <h2 className="text-lg font-semibold text-gray-800">No tienes equipos aún</h2>
          <p className="text-sm text-gray-500 max-w-xs">
            {provider.status === "active"
              ? "Publica tu primer equipo y empieza a recibir reservas."
              : "Una vez que tu cuenta sea aprobada, podrás publicar tus equipos."}
          </p>
          {provider.status === "active" && (
            <Link
              href="/provider/catalog/new"
              className="mt-2 inline-flex items-center gap-2 bg-[#875B9A] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#6a437a] transition-colors"
            >
              Publicar primer equipo
            </Link>
          )}
        </div>
      ) : (
        <ListingsManagerClient listings={listings} />
      )}
    </div>
  );
}
