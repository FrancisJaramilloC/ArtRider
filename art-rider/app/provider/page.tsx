import Link from "next/link";
import { getMyProviderProfile } from "@/services/providerService";
import { getMyListings } from "@/services/listingsService";
import BrandNameCard from "./BrandNameCard";

//  Pagina principal del proveedor
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
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Proveedor</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Centro de Operaciones</h1>
        <p className="text-slate-500 mt-0.5 text-[13px]">Hola, {brandName}.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="rounded-xl border border-slate-100 bg-white px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ingresos del Mes</p>
          <p className="text-2xl font-black text-slate-900 leading-none">$0.00</p>
          <p className="text-[10px] text-slate-400 mt-1">Reservas disponibles pronto</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Reservas Pendientes</p>
          <p className="text-2xl font-black text-slate-900 leading-none">0</p>
          <p className="text-[10px] text-slate-400 mt-1">Sin reservas activas</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Equipos Activos</p>
          <p className="text-2xl font-black text-slate-900 leading-none">{activeListingsCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">{totalListingsCount} en catálogo total</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tasa de Respuesta</p>
          <p className="text-2xl font-black text-slate-900 leading-none">—</p>
          <p className="text-[10px] text-slate-400 mt-1">Disponible con mensajería</p>
        </div>

      </div>

      {/* Sección principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Reservas recientes */}
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-[13px] font-bold text-slate-900">Reservas Recientes</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Tus transacciones más recientes.</p>
            </div>
            <Link
              href="/provider/bookingsProvider"
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors duration-150"
            >
              Ver todas
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-1">Sin reservas todavía</h3>
            <p className="text-[11px] text-slate-400 max-w-[260px]">
              Cuando tus clientes reserven equipos, aparecerán aquí.
            </p>
          </div>
        </div>

        {/* Perfil de proveedor */}
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
