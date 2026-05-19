import { Building2, CreditCard, ChevronRight, CheckCircle2, Clock } from "lucide-react";

//  Pagina de finanzas para proveedores
export default function FinancePage() {
  return (
    <div className="space-y-8 w-full pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Proveedor</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Finanzas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Controla tus ingresos, pagos pendientes y el historial de tus transacciones.
          </p>
        </div>
        <button className="bg-gray-900 hover:bg-gray-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors self-start md:self-auto">
          Retirar Fondos
        </button>
      </div>

      {/*  KPI Cards (Indicadores Clave de Rendimiento) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/*  Total Ingresado  */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-4">Total Ingresado</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">$0.00</p>
          <p className="text-xs text-gray-400">Desde que te uniste</p>
        </div>

        {/*  Próximos Pagos  */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-4">Próximos Pagos</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">$0.00</p>
          <p className="text-xs text-gray-400">Liberación pendiente</p>
        </div>

        {/*  En Tránsito  */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-4">En Tránsito</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">$0.00</p>
          <p className="text-xs text-gray-400">En cuenta bancaria</p>
        </div>

      </div>

      {/*  Main Layout: Transacciones y Métodos de Pago  */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/*  Columna Izquierda: Historial de Transacciones  */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Historial de Transacciones</h2>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex flex-col">

              {/*  Transaccion 1  */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Pago Liberado</p>
                    <p className="text-xs text-gray-500 mt-0.5">Alquiler: Lentes Sony G-Master</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">+$120.00</p>
                    <p className="text-xs text-gray-400 mt-0.5">Hoy, 10:30 AM</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>

              {/*  Transaccion 2  */}
                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Retención por Seguro</p>
                    <p className="text-xs text-gray-500 mt-0.5">Depósito de garantía: DJI Ronin 4D</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">+$500.00</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ayer, 16:45 PM</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>

            </div>

            {/*  Botón para ver todo el historial  */}
            <div className="p-4 bg-gray-50/50 flex justify-center border-t border-gray-100">
              <button className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                Ver todo el historial
              </button>
            </div>
          </div>
        </div>

        {/*  Columna Derecha: Métodos de Pago  */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Métodos de Cobro</h2>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">

            {/*  Metodo 1  */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-100 rounded-xl">
                  <Building2 className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Transferencia Local</p>
                  <p className="text-xs text-gray-500 mt-0.5">Banco Pichincha **** 4589</p>
                </div>
              </div>
              <span className="bg-gray-100 text-gray-600 text-[0.65rem] font-bold px-2 py-1 rounded uppercase tracking-wider">
                Predeterminado
              </span>
            </div>

            {/*  Separador  */}
            <hr className="border-gray-100" />

            {/*  Metodo 2  */}
            <div className="flex items-center justify-between opacity-40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-100 rounded-xl">
                  <CreditCard className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Stripe Connect</p>
                  <p className="text-xs text-gray-500 mt-0.5">No configurado</p>
                </div>
              </div>
            </div>

            {/*  Botón para añadir nueva cuenta  */}
            <button className="w-full bg-white border-2 border-dashed border-gray-300 hover:border-gray-900 text-gray-600 hover:text-gray-900 px-4 py-3 rounded-xl text-sm font-semibold transition-all">
              Añadir nueva cuenta
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
