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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hola, {brandName}</h1>
          <p className="text-sm text-gray-500 mt-1">Aquí tienes el resumen de tu negocio.</p>
        </div>
        <Link
          href="/provider/catalog/new"
          className="inline-flex items-center justify-center gap-2 bg-[#6a437a] hover:bg-[#5c3569] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors active:scale-95"
        >
          <Plus size={16} />
          Añadir Equipo
        </Link>
      </div>

      {/* ── KPI Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingresos del Mes</p>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">$0.00</p>
          <p className="text-xs text-gray-400">Aún no tienes ingresos este mes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reservas Pendientes</p>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <CalendarClock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">0</p>
          <p className="text-xs text-gray-400">Nadie ha reservado todavía</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipos Activos</p>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{activeListingsCount}</p>
          <p className="text-xs text-gray-400">{totalListingsCount} en tu catálogo total</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasa de Respuesta</p>
            <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
              <MessageCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">—</p>
          <p className="text-xs text-gray-400">Se calculará automáticamente</p>
        </div>

      </div>

      {/* ── Main Content Area ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Recent Activity Table */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-gray-900">Reservas Recientes</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tus transacciones más recientes.</p>
            </div>
            <Link href="/provider/bookingsProvider" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              Ver todas →
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <CalendarClock size={22} className="text-gray-300" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Sin reservas todavía</h3>
            <p className="text-xs text-gray-400 max-w-[300px] leading-relaxed">
              Cuando alguien reserve uno de tus equipos, lo verás aquí. Mientras tanto, asegúrate de que tu catálogo esté completo.
            </p>
          </div>
        </div>

        {/* Company Info */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-base font-bold text-gray-900">Tu Bodega</h2>
              <Link href="/provider/settings" className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
                Editar
              </Link>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
                {initials}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{brandName}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Sin calificaciones aún</p>
              </div>
            </div>

            <div className="space-y-4 text-sm border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Miembro desde</p>
                <p className="font-medium text-gray-900">
                  {provider?.created_at 
                    ? new Date(provider.created_at).toLocaleDateString("es-EC", { year: "numeric", month: "long" })
                    : "—"
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Equipos publicados</p>
                <p className="font-medium text-gray-900">{activeListingsCount} activos / {totalListingsCount} total</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Estado KYC</p>
                <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  Pendiente de verificación
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
