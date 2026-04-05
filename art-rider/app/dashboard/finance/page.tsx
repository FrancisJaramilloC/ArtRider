import { Wallet, CalendarClock, ArrowRightLeft, Building2, CreditCard, ChevronRight, CheckCircle2, Clock } from "lucide-react";

export default function FinancePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full pb-10">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-bold text-gray-900 tracking-tight">Finanzas</h1>
          <p className="text-[0.95rem] text-gray-500 mt-1 font-medium">
            Controla tus ingresos, pagos pendientes y el historial de tus transacciones.
          </p>
        </div>
        <button className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl text-[0.95rem] font-semibold transition-colors shadow-sm self-start md:self-auto">
          Retirar Fondos
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Ingresado */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Wallet className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="text-[0.95rem] font-bold text-gray-600">Total Ingresado</span>
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight">$0.00</h3>
            <p className="text-sm text-gray-400 mt-2 font-medium">Desde que te uniste</p>
          </div>
        </div>

        {/* Próximo Pago */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <CalendarClock className="w-24 h-24 text-amber-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
                <CalendarClock className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="text-[0.95rem] font-bold text-gray-600">Próximos Pagos</span>
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight">$0.00</h3>
            <p className="text-sm text-gray-400 mt-2 font-medium">Liberación pendiente</p>
          </div>
        </div>

        {/* En Proceso */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <ArrowRightLeft className="w-24 h-24 text-blue-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500">
                <ArrowRightLeft className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="text-[0.95rem] font-bold text-gray-600">En Tránsito</span>
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight">$0.00</h3>
            <p className="text-sm text-gray-400 mt-2 font-medium">En cuenta bancaria</p>
          </div>
        </div>

      </div>

      {/* ── Main Layout: Transactions & Payout Methods ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Historial de Transacciones */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Historial Reciente</h2>
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Empty State vs Configured rows - We'll put a mock transaction to show off the UI */}
            <div className="flex flex-col">
              
              {/* Mock Row 1 */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#f8f9fa] border border-gray-200 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-[#875B9A] transition-colors">Pago Liberado</p>
                    <p className="text-[0.8rem] text-gray-500 font-medium mt-0.5">Alquiler: Lentes Sony G-Master</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-bold text-emerald-600">+$120.00</p>
                    <p className="text-[0.75rem] text-gray-400 mt-0.5 uppercase tracking-wider">Hoy, 10:30 AM</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </div>

              {/* Mock Row 2 */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#f8f9fa] border border-gray-200 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-[#875B9A] transition-colors">Retención por Seguro</p>
                    <p className="text-[0.8rem] text-gray-500 font-medium mt-0.5">Depósito de garantía: DJI Ronin 4D</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-bold text-gray-900">+$500.00</p>
                    <p className="text-[0.75rem] text-gray-400 mt-0.5 uppercase tracking-wider">Ayer, 16:45 PM</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </div>

            </div>

            {/* Pagination / View All */}
            <div className="p-4 bg-gray-50/50 flex justify-center border-t border-gray-100">
              <button className="text-[0.9rem] font-bold text-[#875B9A] hover:text-[#6a437a] transition-colors">
                Ver todo el historial
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Métodos de Pago */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Métodos de Cobro</h2>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-gray-200">
                  <Building2 className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Transferencia Local</p>
                  <p className="text-[0.8rem] text-gray-500 mt-0.5">Banco Pichincha **** 4589</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-600 text-[0.65rem] font-extrabold px-2 py-1 rounded uppercase tracking-wider">
                Predeterminado
              </span>
            </div>

            <hr className="border-gray-100" />

            <div className="flex items-center justify-between opacity-50 grayscale">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-gray-200">
                  <CreditCard className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Stripe Connect</p>
                  <p className="text-[0.8rem] text-gray-500 mt-0.5">No configurado</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 bg-white border-2 border-dashed border-gray-300 hover:border-gray-900 text-gray-600 hover:text-gray-900 px-4 py-3 rounded-xl text-sm font-bold transition-all">
              Añadir nueva cuenta
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
