import Link from "next/link";
import { Plus, TrendingUp, Package, CalendarClock, MessageCircle, Edit3 } from "lucide-react";

export default function ProviderOverviewPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hola, EJ Audiovisuales</h1>
          <p className="text-gray-500 mt-1">Aquí tienes el resumen de tu negocio de hoy.</p>
        </div>
        <Link 
          href="/provider/catalog"
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
          <p className="text-3xl font-bold text-gray-900 mb-2">$450.00</p>
          <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
            <span>+15% desde el mes pasado</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-gray-500">Reservas Pendientes</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CalendarClock size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">3</p>
          <div className="flex items-center text-xs font-semibold text-gray-500 bg-gray-100 w-fit px-2 py-1 rounded-md">
            <span>Requieren tu acción</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-gray-500">Equipos Activos</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">12</p>
          <div className="flex items-center text-xs font-semibold text-gray-500 bg-gray-100 w-fit px-2 py-1 rounded-md">
            <span>En tu inventario</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-gray-500">Tasa de Respuesta</p>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <MessageCircle size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">98%</p>
          <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
            <span>Tiempo prom: 1h</span>
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
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Equipo</th>
                  <th className="px-6 py-4 font-medium">Fechas</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80 text-gray-700">
                
                {/* Row 1 */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">Carlos M.</td>
                  <td className="px-6 py-4 max-w-[200px] truncate">Sony FX3 + Lentes</td>
                  <td className="px-6 py-4 text-gray-500">12 - 14 Oct</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      Pendiente
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">$120.00</td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">Lucía S.</td>
                  <td className="px-6 py-4 max-w-[200px] truncate">Subwoofer Activo Beta 3</td>
                  <td className="px-6 py-4 text-gray-500">08 - 09 Oct</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      Confirmado
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">$50.00</td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">Agencia X</td>
                  <td className="px-6 py-4 max-w-[200px] truncate">Kit Iluminación Pro</td>
                  <td className="px-6 py-4 text-gray-500">01 - 05 Oct</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                      Completado
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">$250.00</td>
                </tr>
                
              </tbody>
            </table>
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
                  EJ
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">EJ Audiovisuales</h3>
                  <p className="text-sm text-gray-500">Calificación: ⭐ 4.9 (12 reviews)</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-0.5">Ubicación</p>
                  <p className="font-medium text-gray-900">Calle República y Eloy Alfaro, Quito, EC</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Estado KYC</p>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    Identidad Verificada
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
