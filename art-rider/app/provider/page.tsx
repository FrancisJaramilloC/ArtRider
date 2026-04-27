import Link from "next/link";
import { Plus, TrendingUp, Package, CalendarClock, MessageCircle, Edit3 } from "lucide-react";
import { getMyProviderProfile } from "@/services/providerService";
import { getMyListings } from "@/services/listingsService";

export default async function ProviderOverviewPage() {
  const provider = await getMyProviderProfile();
  const listings = await getMyListings();

  const brandName = provider?.brand_name ?? "Proveedor";
  const initials = brandName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const activeListingsCount = listings.filter((l) => l.is_published).length;
  const totalListingsCount = listings.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hola, {brandName}</h1>
          <p className="text-gray-500 mt-1">Aquí tienes el resumen de tu negocio de hoy.</p>
        </div>
        <Link 
          href="/provider/catalog/new"
          className="inline-flex items-center justify-center gap-2 bg-[#875B9A] hover:bg-[#6a437a] text-white px-5 py-2.5 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 shadow-md shadow-purple-900/10"
        >
          <Plus size={18} />
          Añadir Nuevo Equipo
        </Link>
      </div>

      {/* ── KPI Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-gray-500">Ingresos del Mes</p>
            <div className="p-2 bg-purple-50 text-[#875B9A] rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">$0.00</p>
          <div className="flex items-center text-xs font-semibold text-gray-500 bg-gray-100 w-fit px-2 py-1 rounded-md">
            <span>Las reservas estarán disponibles pronto</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-gray-500">Reservas Pendientes</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CalendarClock size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
          <div className="flex items-center text-xs font-semibold text-gray-500 bg-gray-100 w-fit px-2 py-1 rounded-md">
            <span>Sin reservas activas</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-gray-500">Equipos Activos</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">{activeListingsCount}</p>
          <div className="flex items-center text-xs font-semibold text-gray-500 bg-gray-100 w-fit px-2 py-1 rounded-md">
            <span>{totalListingsCount} en tu catálogo total</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-gray-500">Tasa de Respuesta</p>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <MessageCircle size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">—</p>
          <div className="flex items-center text-xs font-semibold text-gray-500 bg-gray-100 w-fit px-2 py-1 rounded-md">
            <span>Disponible con mensajería</span>
          </div>
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
            <Link href="/provider/bookingsProvider" className="text-sm font-semibold text-[#875B9A] hover:underline">
              Ver todas
            </Link>
          </div>
          
          {/* Empty state for bookings */}
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <CalendarClock size={24} className="text-gray-300" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Sin reservas todavía</h3>
            <p className="text-xs text-gray-400 max-w-[280px]">
              Cuando tus clientes reserven equipos, aparecerán aquí. Empieza publicando tu inventario.
            </p>
          </div>
        </div>

        {/* Quick Company Info */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-10 -mt-10 -z-0"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-bold text-gray-900">Tu Bodega</h2>
                <button className="text-gray-400 hover:text-[#875B9A] transition-colors bg-white rounded-full p-2 hover:bg-purple-50">
                  <Edit3 size={18} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-xl">
                  {initials}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{brandName}</h3>
                  <p className="text-sm text-gray-500">Sin calificaciones aún</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-0.5">Miembro desde</p>
                  <p className="font-medium text-gray-900">
                    {provider?.created_at 
                      ? new Date(provider.created_at).toLocaleDateString("es-EC", { year: "numeric", month: "long" })
                      : "—"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Equipos publicados</p>
                  <p className="font-medium text-gray-900">{activeListingsCount} activos / {totalListingsCount} total</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Estado KYC</p>
                  <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-medium">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Pendiente de verificación
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
