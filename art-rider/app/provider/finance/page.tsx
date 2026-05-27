import { Building2, CreditCard, ChevronRight, CheckCircle2, Clock } from "lucide-react";

export default function FinancePage() {
  return (
    <div className="space-y-6 w-full pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Proveedor</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finanzas</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Controla tus ingresos, pagos pendientes y el historial de transacciones.
          </p>
        </div>
        <button className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors self-start sm:self-auto shrink-0">
          Retirar Fondos
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white rounded-xl border border-slate-100 px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Ingresado</p>
          <p className="text-2xl font-black text-slate-900 leading-none">$0.00</p>
          <p className="text-[10px] text-slate-400 mt-1">Desde que te uniste</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Próximos Pagos</p>
          <p className="text-2xl font-black text-slate-900 leading-none">$0.00</p>
          <p className="text-[10px] text-slate-400 mt-1">Liberación pendiente</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">En Tránsito</p>
          <p className="text-2xl font-black text-slate-900 leading-none">$0.00</p>
          <p className="text-[10px] text-slate-400 mt-1">En cuenta bancaria</p>
        </div>

      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Historial */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Historial de Transacciones</p>

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">

            {/* Fila 1 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-[12px]">Pago Liberado</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Alquiler: Lentes Sony G-Master</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="font-bold text-slate-900 text-[12px]">+$120.00</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Hoy, 10:30</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>

            {/* Fila 2 */}
            <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-[12px]">Retención por Seguro</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Depósito de garantía: DJI Ronin 4D</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="font-bold text-slate-900 text-[12px]">+$500.00</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ayer, 16:45</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 flex justify-center">
              <button className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors duration-150">
                Ver todo el historial
              </button>
            </div>

          </div>
        </div>

        {/* Métodos de Cobro */}
        <div className="space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Métodos de Cobro</p>

          <div className="bg-white rounded-xl border border-slate-100 px-4 py-4 space-y-4">

            {/* Método 1 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Building2 className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-[12px]">Transferencia Local</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Banco Pichincha **** 4589</p>
                </div>
              </div>
              <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                Predeterminado
              </span>
            </div>

            <hr className="border-slate-100" />

            {/* Método 2 */}
            <div className="flex items-center gap-2.5 opacity-40">
              <div className="p-2 bg-slate-50 rounded-lg">
                <CreditCard className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-[12px]">Stripe Connect</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No configurado</p>
              </div>
            </div>

            {/* Añadir cuenta */}
            <button className="w-full border border-dashed border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-150">
              Añadir nueva cuenta
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
