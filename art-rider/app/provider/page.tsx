import Link from "next/link";
import { Plus } from "lucide-react";
import { getMyProviderProfile } from "@/services/providerService";
import { getMyListings } from "@/services/listingsService";
import BrandNameCard from "./BrandNameCard";

export default async function ProviderOverviewPage() {
  const provider = await getMyProviderProfile();
  const listings = await getMyListings();

  const brandName = provider?.brand_name ?? "Proveedor";
  const initials = brandName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const activeListingsCount = listings.filter((l) => l.is_published).length;
  const totalListingsCount = listings.length;
  const memberSince = provider?.created_at
    ? new Date(provider.created_at).toLocaleDateString("es-EC", { year: "numeric", month: "long" })
    : "—";

  return (
    <div className="space-y-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Proveedor</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Centro de Operaciones</h1>
          <p className="text-gray-500 mt-1 text-sm">Hola, {brandName}. Aquí tienes el resumen de tu negocio de hoy.</p>
        </div>
        <Link
          href="/provider/catalog/new"
          className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} />
          Añadir Nuevo Equipo
        </Link>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-4">Ingresos del Mes</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">$0.00</p>
          <p className="text-xs text-gray-400">Las reservas estarán disponibles pronto</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-4">Reservas Pendientes</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
          <p className="text-xs text-gray-400">Sin reservas activas</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-4">Equipos Activos</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{activeListingsCount}</p>
          <p className="text-xs text-gray-400">{totalListingsCount} en tu catálogo total</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-4">Tasa de Respuesta</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">—</p>
          <p className="text-xs text-gray-400">Disponible con mensajería</p>
        </div>

      </div>

      {/* ── Main Content Area ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">

        {/* Recent Activity Table */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Reservas Recientes</h2>
              <p className="text-sm text-gray-500 mt-0.5">Tus transacciones más recientes.</p>
            </div>
            <Link href="/provider/bookingsProvider" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              Ver todas
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Sin reservas todavía</h3>
            <p className="text-xs text-gray-400 max-w-[280px]">
              Cuando tus clientes reserven equipos, aparecerán aquí. Empieza publicando tu inventario.
            </p>
          </div>
        </div>

        {/* Quick Company Info */}
        <BrandNameCard
          brandName={brandName}
          initials={initials}
          memberSince={memberSince}
          activeListingsCount={activeListingsCount}
          totalListingsCount={totalListingsCount}
        />

      </div>

    </div>
  );
}
