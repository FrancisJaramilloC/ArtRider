import { getAdminListings, getAdvisoryRequests } from "@/services/adminService";
import { Package, ClipboardList, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const [listings, requests] = await Promise.all([
    getAdminListings(),
    getAdvisoryRequests(),
  ]);

  const published = listings.filter(l => l.is_published);
  const withoutSpecs = listings.filter(l => !l.specs || Object.keys(l.specs).length === 0);
  const withSpecs = listings.length - withoutSpecs.length;
  
  const pendingRequests = requests.filter(r => r.status === "pending");
  const withProposal = requests.filter(r => r.advisory_proposals?.length > 0);

  const kpis = [
    {
      label: "Equipos Publicados",
      value: published.length,
      sub: `${listings.length} total`,
      icon: Package,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Sin Metadata",
      value: withoutSpecs.length,
      sub: `${withSpecs} con specs`,
      icon: AlertTriangle,
      color: withoutSpecs.length > 0 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600",
    },
    {
      label: "Solicitudes",
      value: requests.length,
      sub: `${pendingRequests.length} pendientes`,
      icon: ClipboardList,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Con Propuesta",
      value: withProposal.length,
      sub: requests.length > 0 ? `${Math.round((withProposal.length / requests.length) * 100)}% tasa` : "0%",
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-500 mt-1">Resumen general del marketplace y motor de cotización.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/equipos"
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
            <h3 className="font-semibold">Gestionar Equipos & Metadata</h3>
          </div>
          <p className="text-sm text-gray-500">
            Asigna watts, tipo de sistema y cobertura a cada equipo publicado.
            {withoutSpecs.length > 0 && (
              <span className="text-amber-600 font-medium"> ({withoutSpecs.length} sin metadata)</span>
            )}
          </p>
        </Link>

        <Link
          href="/admin/solicitudes"
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
            <h3 className="font-semibold">Ver Solicitudes del Motor</h3>
          </div>
          <p className="text-sm text-gray-500">
            Revisa las cotizaciones, métricas ECS y decisiones del algoritmo.
            {pendingRequests.length > 0 && (
              <span className="text-purple-600 font-medium"> ({pendingRequests.length} pendientes)</span>
            )}
          </p>
        </Link>
      </div>
    </div>
  );
}
